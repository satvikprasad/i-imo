import base64
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI()

origins = ["*"]  # This allows all origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # Set to True if your frontend needs to send cookies or authorization headers
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, PUT, DELETE, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers
)

class Image(BaseModel):
    image: str


@app.post("/upload/")
async def create_item(img: Image):
    data = img.image
    _, encoded = data.split(',', 1)
    binary_data = base64.b64decode(encoded)
    with open("output.jpg", "wb") as f:
        f.write(binary_data)
    
    return {"success": True, "message": "Image saved successfully."}
  
  
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)