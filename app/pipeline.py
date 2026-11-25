
import os

from dotenv import load_dotenv
from loguru import logger

from app.database.db import init_db
from app.tools.appointments import (
    seed_database,
    complete_expired_appointments,
)

from app.tools.voice_tools import create_voice_tools
from app.agents.doctor_agent import DOCTOR_AGENT_PROMPT

# Load environment variables
load_dotenv()

# Initialize database and maintain appointment records
init_db()
seed_database()

result = complete_expired_appointments()
logger.info(f"Appointment maintenance: {result}")


from app.tools.voice_tools import create_voice_tools
from app.agents.doctor_agent import DOCTOR_AGENT_PROMPT

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker

from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)

from pipecat.services.elevenlabs.stt import (
    ElevenLabsRealtimeSTTService,
)

from pipecat.services.elevenlabs.tts import (
    ElevenLabsTTSService,
)

from pipecat.services.google.llm import GoogleLLMService

from pipecat.transports.base_transport import TransportParams
from pipecat.transports.smallwebrtc.connection import (
    SmallWebRTCConnection,
)
from pipecat.transports.smallwebrtc.transport import (
    SmallWebRTCTransport,
)

from pipecat.runner.types import RunnerArguments
from pipecat.workers.runner import WorkerRunner


load_dotenv()


# -----------------------------------------
# ENVIRONMENT CONFIGURATION
# -----------------------------------------

required_keys = [
    "GOOGLE_API_KEY",
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_VOICE_ID",
]

for key in required_keys:
    if not os.getenv(key):
        raise RuntimeError(f"Missing environment variable: {key}")


GOOGLE_MODEL = os.getenv(
    "GOOGLE_MODEL",
    "gemini-2.5-flash"
)

ELEVENLABS_MODEL = "eleven_flash_v2_5"


# -----------------------------------------
# CREATE VOICE PIPELINE
# -----------------------------------------

async def run_bot(transport, runner_args):

    logger.info("Initializing hospital appointment assistant")

    # 1. Speech to Text
    stt = ElevenLabsRealtimeSTTService(
        api_key=os.getenv("ELEVENLABS_API_KEY"),
    )

    # 2. Large Language Model
    llm = GoogleLLMService(
        api_key=os.getenv("GOOGLE_API_KEY"),
        settings=GoogleLLMService.Settings(
            model=GOOGLE_MODEL,
            system_instruction=DOCTOR_AGENT_PROMPT,
            temperature=0.3,
            max_tokens=512,
        ),
    )

    # 3. Text to Speech
    tts = ElevenLabsTTSService(
        api_key=os.getenv("ELEVENLABS_API_KEY"),
        settings=ElevenLabsTTSService.Settings(
            voice=os.getenv("ELEVENLABS_VOICE_ID"),
            model=ELEVENLABS_MODEL,
        ),
    )

    # 4. Register voice tools
    voice_tools = create_voice_tools()

    logger.info(
        "Registered tools: {}",
        len(voice_tools)
    )

    # 5. Conversation context
    context = LLMContext(
        tools=voice_tools
    )

    user_aggregator, assistant_aggregator = (
        LLMContextAggregatorPair(
            context,
            user_params=LLMUserAggregatorParams(
                vad_analyzer=SileroVADAnalyzer()
            ),
        )
    )

    # 6. Build pipeline
    pipeline = Pipeline([
        transport.input(),
        stt,
        user_aggregator,
        llm,
        tts,
        transport.output(),
        assistant_aggregator,
    ])

    # 7. Pipeline worker
    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    runner = WorkerRunner(
        handle_sigint=runner_args.handle_sigint
    )

    await runner.add_workers(worker)

    # 8. Browser connection event
    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):

        logger.info("Doctor assistant client connected")

        context.add_message({
            "role": "developer",
            "content": (
                "The caller has connected. "
                "Greet them naturally as a hospital receptionist "
                "and ask how you can help."
            ),
        })

        await worker.queue_frames([
            LLMRunFrame()
        ])

    # 9. Browser disconnection event
    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):

        logger.info("Doctor assistant client disconnected")

        await runner.cancel()

    logger.info("Starting voice assistant worker")

    await runner.run()


# -----------------------------------------
# PIPECAT WEBRTC ENTRY POINT
# -----------------------------------------

async def bot(runner_args: RunnerArguments):

    webrtc_connection: SmallWebRTCConnection = (
        runner_args.webrtc_connection
    )

    transport = SmallWebRTCTransport(
        webrtc_connection=webrtc_connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
        ),
    )

    await run_bot(
        transport,
        runner_args
    )


# -----------------------------------------
# START SERVER
# -----------------------------------------

if __name__ == "__main__":

    from pipecat.runner.run import main

    main()
