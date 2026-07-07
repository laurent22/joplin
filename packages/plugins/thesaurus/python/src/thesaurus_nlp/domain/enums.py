from enum import StrEnum

class ModelType(StrEnum):
    """Tested encoding models for the similarity ranker."""
    MINILM_L6_V2 = "sentence-transformers/all-MiniLM-L6-v2"
    MPNET_V2 = "sentence-transformers/all-mpnet-base-v2" 
    BGE = "BAAI/bge-base-en-v1.5"

DEFAULT_MODEL = ModelType.MPNET_V2
