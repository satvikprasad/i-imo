import base64
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
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