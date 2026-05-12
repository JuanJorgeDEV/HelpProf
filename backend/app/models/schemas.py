from __future__ import annotations

from datetime import datetime
from typing import Any, Literal  # noqa: F401
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.pill_constraints import normalize_slides_url_incoming


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

class CategoryPublicOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    slug: str
    name: str
    group_tag: str | None = None
    logo_url: str | None = None
    brand_color: str = "#6366f1"
    sort_order: int = 0


class CategoryCreateIn(BaseModel):
    slug: str = Field(..., min_length=1, max_length=60, pattern=r"^[A-Z0-9_-]+$")
    name: str = Field(..., min_length=1, max_length=200)
    group_tag: str | None = Field(default=None, max_length=80)
    logo_url: str | None = Field(default=None, max_length=2048)
    brand_color: str = Field(default="#6366f1", max_length=20)
    sort_order: int = Field(default=0, ge=0, le=9999)

    @field_validator("slug", mode="before")
    @classmethod
    def upper_slug(cls, v: Any) -> str:
        return str(v).strip().upper()

    @field_validator("group_tag", mode="before")
    @classmethod
    def clean_group_tag(cls, v: Any) -> str | None:
        if v is None:
            return None
        s = str(v).strip()
        return s or None


class CategoryUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    group_tag: str | None = Field(default=None, max_length=80)
    logo_url: str | None = Field(default=None, max_length=2048)
    brand_color: str | None = Field(default=None, max_length=20)
    sort_order: int | None = Field(default=None, ge=0, le=9999)

    @field_validator("group_tag", mode="before")
    @classmethod
    def clean_group_tag(cls, v: Any) -> str | None:
        if v is None:
            return None
        s = str(v).strip()
        return s or None


class PillPublicOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    title: str
    tool_category: str
    survival_content: str
    tags: list[str]
    views_count: int
    slides_url: str | None = None


class PillCardOut(BaseModel):
    """Lista / carrossel — sem texto longo quando desejável."""

    id: UUID
    title: str
    tool_category: str
    tags: list[str]
    views_count: int


class ViewResponse(BaseModel):
    pill_id: UUID
    views_count: int


class PillCreateIn(BaseModel):
    title: str = Field(..., max_length=500)
    tool_category: str = Field(..., max_length=60)
    survival_content: str
    tags: list[str] = Field(default_factory=list)
    slides_url: str | None = Field(default=None, max_length=2048)

    @field_validator("tool_category", mode="before")
    @classmethod
    def normalize_create_tool_category(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise TypeError("tool_category deve ser string.")
        return str(v).strip().upper()

    @field_validator("slides_url", mode="before")
    @classmethod
    def slides_url_sanitize(cls, v: Any) -> str | None:
        """Aceita iframe, /pub ou /pubembed; normaliza para HTTPS …/pubembed."""
        return normalize_slides_url_incoming(v)

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags(cls, v: Any) -> list[str]:
        if not v:
            return []
        if not isinstance(v, list):
            raise TypeError("tags deve ser lista de strings.")
        out: list[str] = []
        for t in v:
            if not isinstance(t, str):
                raise TypeError("tags deve ser lista de strings.")
            s = t.strip()
            if s:
                out.append(s[:200])
        return out


class PillUpdateIn(BaseModel):
    title: str | None = Field(None, max_length=500)
    tool_category: str | None = Field(None, max_length=60)
    survival_content: str | None = None
    tags: list[str] | None = None
    slides_url: str | None = Field(default=None, max_length=2048)

    @field_validator("tool_category", mode="before")
    @classmethod
    def normalize_update_tool_category(cls, v: Any) -> str | None:
        if v is None or (isinstance(v, str) and not str(v).strip()):
            return None
        if not isinstance(v, str):
            raise TypeError("tool_category deve ser string.")
        return str(v).strip().upper()

    @field_validator("slides_url", mode="before")
    @classmethod
    def slides_url_sanitize_update(cls, v: Any) -> str | None:
        if v is None:
            return None
        return normalize_slides_url_incoming(v)


class PillAdminOut(PillPublicOut):
    deleted_at: datetime | None


class DomainGuidePublicOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    tool_category: str
    title: str
    deep_content: str
    slides_embed: str | None


class DomainGuideCreateIn(BaseModel):
    tool_category: str = Field(..., max_length=60)
    title: str = Field(..., max_length=500)
    deep_content: str
    slides_embed: str | None = None

    @field_validator("tool_category", mode="before")
    @classmethod
    def normalize_domain_tool_category(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise TypeError("tool_category deve ser string.")
        return str(v).strip().upper()


class DomainGuideUpdateIn(BaseModel):
    title: str | None = Field(None, max_length=500)
    deep_content: str | None = None
    slides_embed: str | None = None


class LumeQueryIn(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    scenario: Literal["home", "pill"] = "home"
    pill_id: UUID | None = None

    @model_validator(mode="after")
    def pill_id_required_when_pill_context(self):
        if self.scenario == "pill" and self.pill_id is None:
            raise ValueError('pill_id é obrigatório quando scenario=="pill".')
        return self


class LumeQueryOut(BaseModel):
    answer: str
    low_confidence: bool = False
    suggested_pills: list[PillCardOut] = Field(default_factory=list)
    suggested_questions: list[str] = Field(default_factory=list)


class EmbedWebhookIn(BaseModel):
    pill_id: UUID
    text: str | None = None


class HealthOut(BaseModel):
    status: str
    dependencies: dict[str, str]
