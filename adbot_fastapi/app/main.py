from fastapi import FastAPI
from app.routers import testconnection, users, groups, computers, ous
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "ADBot FastAPI with WinRM is running!"}

app.include_router(testconnection.router)

app.include_router(users.router)
app.include_router(groups.router)
app.include_router(computers.router)
app.include_router(ous.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)