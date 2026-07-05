from pydantic import BaseModel, ConfigDict, Field

class RankRequest(BaseModel):
    """Received request."""
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    word: str
    context: str | None = None
    top_n: int | None = Field(default=10, ge=1, alias='topN')

class SynonymEntry(BaseModel):
    """A synonym entry."""
    word: str
    score: float = Field(ge=0, le=1)
    pos: str | None = None

class RankResponse(BaseModel):
    """Response to be sent."""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    results: list[SynonymEntry]
    error: str | None = None

