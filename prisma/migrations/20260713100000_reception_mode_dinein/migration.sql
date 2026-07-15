-- Ajoute le mode « Sur place » (dine-in) distinct de « À emporter » (pickup)
ALTER TYPE "ReceptionMode" ADD VALUE IF NOT EXISTS 'DINEIN';
