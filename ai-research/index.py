
from pathlib import Path
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "tugasin_model.pkl"
model = joblib.load(MODEL_PATH)

app = FastAPI(
    title="TUGASIN Machine Learning API",
    description="API prediksi prioritas tugas mahasiswa",
    version="1.0.0"
)

class TaskInput(BaseModel):
    Jenis_Tugas: str
    Sisa_Hari_Deadline: int = Field(ge=0)
    Tingkat_Kesulitan: str
    Tingkat_Penting: str
    Estimasi_Waktu_Jam: int = Field(ge=0)

@app.get("/")
def home():
    return {
        "status": "success",
        "message": "TUGASIN Python API berhasil dijalankan",
        "model": "Random Forest"
    }

@app.post("/predict")
def predict_priority(data: TaskInput):
    try:
        input_data = pd.DataFrame([{
            "Jenis_Tugas": data.Jenis_Tugas,
            "Sisa_Hari_Deadline": data.Sisa_Hari_Deadline,
            "Tingkat_Kesulitan": data.Tingkat_Kesulitan,
            "Tingkat_Penting": data.Tingkat_Penting,
            "Estimasi_Waktu_Jam": data.Estimasi_Waktu_Jam
        }])

        prediction = model.predict(input_data)[0]
        probabilities = model.predict_proba(input_data)[0]

        probability_result = {
            str(label): round(float(probability) * 100, 2)
            for label, probability in zip(
                model.classes_, probabilities
            )
        }

        return {
            "status": "success",
            "prioritas": str(prediction),
            "probabilitas": probability_result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
