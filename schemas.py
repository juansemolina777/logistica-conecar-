from datetime import date
from typing import Optional, List

from pydantic import BaseModel, Field


# -------------------------
# Transportistas
# -------------------------
class TransportistaCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=255)


class TransportistaOut(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True


# -------------------------
# Fletes
# -------------------------
class FleteCreate(BaseModel):
    fecha: Optional[date] = None
    dia: Optional[str] = None

    o_carga: str = Field(min_length=1, max_length=80)
    anio_mes: Optional[str] = None

    cliente_destino: Optional[str] = None

    transportista_id: int
    cod_transporte: Optional[str] = None
    ingrese_transporte: Optional[str] = None

    km: Optional[float] = None
    tn_orden_carga: Optional[float] = None
    tn_cargadas: Optional[float] = None
    aforo: Optional[float] = None

    tarifa_asign: Optional[float] = None
    flete_cobrado: Optional[float] = None

    tarifa_tte: Optional[float] = None
    flete_pagado: Optional[float] = None

    observacion: Optional[str] = None


class FleteOut(BaseModel):
    id: int

    fecha: Optional[date] = None
    dia: Optional[str] = None

    o_carga: str
    anio_mes: Optional[str] = None

    cliente_destino: Optional[str] = None

    transportista_id: int
    cod_transporte: Optional[str] = None
    ingrese_transporte: Optional[str] = None

    km: Optional[float] = None
    tn_orden_carga: Optional[float] = None
    tn_cargadas: Optional[float] = None
    aforo: Optional[float] = None

    tarifa_asign: Optional[float] = None
    flete_cobrado: Optional[float] = None

    tarifa_tte: Optional[float] = None
    flete_pagado: Optional[float] = None

    diferencia: Optional[float] = None
    observacion: Optional[str] = None

    class Config:
        from_attributes = True
