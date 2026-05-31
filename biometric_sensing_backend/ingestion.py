import struct
import socket
import asyncio
import os
import logging
import numpy as np
import redis.asyncio as aioredis
from typing import Tuple, Optional

# Configure Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("CsiIngestService")

# Network and Redis Configurations
UDP_HOST = os.getenv("UDP_HOST", "0.0.0.0")
UDP_PORT = int(os.getenv("UDP_PORT", "8080"))
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
REDIS_STREAM_NAME = "csi_stream"
REDIS_STREAM_MAXLEN = 10000  # Cap stream size to prevent memory leaks (OOM)

# C-Struct layout matching physical sniffer firmware (Packed, Little-Endian)
# offset 0:  char magic[4]         -> 4s
# offset 4:  uint32_t seq          -> I
# offset 8:  uint8_t mac[6]        -> 6s
# offset 14: uint8_t dmac[6]       -> 6s
# offset 20: int8_t rssi           -> b
# offset 21: int8_t noise_floor    -> b
# offset 22: uint8_t channel       -> B
# offset 23: uint8_t bandwidth     -> B
# offset 24: uint8_t sig_mode      -> B
# offset 25: uint8_t mcs           -> B
# offset 26: uint32_t hw_timestamp -> I
# offset 30: uint16_t len          -> H
# Total static header size = 32 bytes (packed)
CSI_HEADER_FORMAT = "<4sI6s6sbbBBBBIH"
CSI_HEADER_SIZE = struct.calcsize(CSI_HEADER_FORMAT)

class CsiIngestionProtocol(asyncio.DatagramProtocol):
    """
    High-performance, asynchronous UDP Datagram Protocol handling incoming WiFi CSI telemetry.
    """
    def __init__(self, redis_client: aioredis.Redis):
        super().__init__()
        self.redis = redis_client
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport
        logger.info(f"🟢 UDP Ingestion server bound successfully. Listening on {UDP_HOST}:{UDP_PORT}")

    def datagram_received(self, data: bytes, addr: Tuple[str, int]):
        if len(data) < CSI_HEADER_SIZE:
            return

        try:
            # 1. Unpack Header Struct
            header_data = data[:CSI_HEADER_SIZE]
            (
                magic,
                seq,
                mac,
                dmac,
                rssi,
                noise_floor,
                channel,
                bandwidth,
                sig_mode,
                mcs,
                hw_timestamp,
                csi_len,
            ) = struct.unpack(CSI_HEADER_FORMAT, header_data)

            # Validate Header Magic Identification
            if not magic.startswith(b"CSI"):
                return

            expected_size = CSI_HEADER_SIZE + csi_len
            if len(data) < expected_size:
                logger.warning(f"⚠️ Truncated frame: expected {expected_size} bytes, got {len(data)}")
                return

            # 2. Extract Raw Signed 8-bit complex I/Q matrix [Imag0, Real0, ...]
            csi_payload = data[CSI_HEADER_SIZE:expected_size]
            raw_csi = np.frombuffer(csi_payload, dtype=np.int8)

            # 3. Format MAC addresses to standard human-readable colon-delimited hex
            mac_str = ":".join(f"{b:02x}" for b in mac)
            dmac_str = ":".join(f"{b:02x}" for b in dmac)

            # 4. Serialize raw CSI array to a flat comma-separated string for high-speed parsing
            csi_data_str = ",".join(map(str, raw_csi.tolist()))

            # 5. Build packed field payload dictionary
            stream_payload = {
                "seq": str(seq),
                "mac": mac_str,
                "dmac": dmac_str,
                "rssi": str(rssi),
                "noise_floor": str(noise_floor),
                "channel": str(channel),
                "bandwidth": str(bandwidth),
                "sig_mode": str(sig_mode),
                "mcs": str(mcs),
                "hw_timestamp": str(hw_timestamp),
                "csi_data": csi_data_str
            }

            # 6. Publish directly to high-throughput Redis Stream asynchronously
            # Uses approximate trimming (~ maxlen) to minimize processing overhead per packet
            asyncio.create_task(
                self.redis.xadd(
                    REDIS_STREAM_NAME,
                    stream_payload,
                    maxlen=REDIS_STREAM_MAXLEN,
                    approximate=True
                )
            )

        except Exception as e:
            logger.error(f"❌ Ingestion Datagram parsing exception: {e}")

    def connection_lost(self, exc):
        logger.info("🔴 UDP Ingestion socket connection closed.")


async def start_ingestion_service():
    """
    Spins up and orchestrates the Redis-backed async UDP Ingestion socket.
    """
    logger.info(f"🔗 Establishing connection to Redis at {REDIS_URL}...")
    redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
    
    # Test Redis Connection
    await redis_client.ping()
    logger.info("✅ Successfully bridged connection to Redis.")

    loop = asyncio.get_running_loop()
    transport, protocol = await loop.create_datagram_endpoint(
        lambda: CsiIngestionProtocol(redis_client),
        local_addr=(UDP_HOST, UDP_PORT)
    )

    try:
        # Keep datagram endpoint running infinitely
        while True:
            await asyncio.sleep(3600)
    except asyncio.CancelledError:
        logger.info("🛑 Ingestion service cancellation requested.")
    finally:
        transport.close()
        await redis_client.close()
        logger.info("🔌 Redis client connection closed cleanly.")

if __name__ == "__main__":
    try:
        asyncio.run(start_ingestion_service())
    except KeyboardInterrupt:
        logger.info("👋 Service stopped by user command.")
