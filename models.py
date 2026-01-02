from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    Numeric,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship

from .db import Base


class Transportista(Base):
    __tablename__ = "transportistas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), unique=True, nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Flete(Base):
    __tablename__ = "fletes"

    id = Column(Integer, primary_key=True, index=True)

    fecha = Column(Date, nullable=True)
    dia = Column(String(30), nullable=True)

    o_carga = Column(String(80), unique=True, nullable=False, index=True)
    anio_mes = Column(String(20), nullable=True)

    cliente_destino = Column(String(255), nullable=True)

    transportista_id = Column(Integer, ForeignKey("transportistas.id"), nullable=False)
    transportista = relationship("Transportista")

    cod_transporte = Column(String(80), nullable=True)
    ingrese_transporte = Column(String(255), nullable=True)

    km = Column(Numeric(12, 2), nullable=True)
    tn_orden_carga = Column(Numeric(12, 3), nullable=True)
    tn_cargadas = Column(Numeric(12, 3), nullable=True)

    aforo = Column(Numeric(12, 3), nullable=True)

    tarifa_asign = Column(Numeric(12, 2), nullable=True)
    flete_cobrado = Column(Numeric(12, 2), nullable=True)

    tarifa_tte = Column(Numeric(12, 2), nullable=True)
    flete_pagado = Column(Numeric(12, 2), nullable=True)

    diferencia = Column(Numeric(12, 2), nullable=True)

    observacion = Column(String(500), nullable=True)
    estado = Column(String(60), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
