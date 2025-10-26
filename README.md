# I-IMO - Intelligent IRL Meeting Organizer

## If you are applovin judges - please check out this section
<details>

<summary>Applovin Click Here</summary>

The readme for applovin's challange is located at `applovin` folder. You can also [click here](https://github.com/satvikprasad/i-imo/tree/master/applovin)
</details>


## Inspiration
I usually a yapper and talk with a lot of people, but at the end of the day, you look back yourself and can't remember all of them or sometimes you just remember the faces but not what their infomation. Maybe I'm a bad person or I'm just having a bad memory ;D. So we built I-IMO!

A conversational AI agent designed with the busiest people in mind. I-IMO scans both visual input (webcam) and oral input (OMI devkit2) throughout your day to organize and summarize profiles for everyone you meet, while maintaining task lists and tracking important events so you never forget anything important from your meetings.

- We want to do this app on any smart glasses, but we could not get one. Snapchat spectacles are all reserved and Omi glasses - turn out they are giving out omi devkit (voice only) device.

## What It Does
I-IMO is your personal meeting intelligence assistant that:

- Captures conversations through real-time audio transcription
- Recognizes faces via webcam to identify meeting participants
- Builds personal profiles automatically from conversation context
- Extracts action items and creates task lists from discussions
- Maintains conversation history with semantic search capabilities
- Never lets you forget important details about the people you meet


## How We Built It
- React + Typescript + Vite
- FastAPI + Custom YOLO model for face detection
- Tailwind + Shad/CN UI
- Convex Backend
- Express Backend that process voice
- Groq for audio transcribing
- Digital Ocean AI Gradient for GPU intense task
- ChromaDB for VectorDB and semantic search
- OpenAI Text Embedding

## Architecture
<img width="1282" height="855" alt="image" src="https://github.com/user-attachments/assets/96eb66ad-cd64-4200-9816-2d2ac04b85ad" />


## Challenges we ran into

- connection issues
- high accuracy face classification (tagging id and tag name with it).
- 5 seconds chunk audio cut of certains words transcripting.


## What we learned
- We use a lot of technologies and learn how to use it together.
- Implements muitple backend with low latency.

## Whats next
- Deep intergration with glasses.
- Link local profile with linkedin / github and more social medias.
- When you wake up, remind you the whole day ahead.
