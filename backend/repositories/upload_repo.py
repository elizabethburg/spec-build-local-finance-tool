from sqlalchemy.orm import Session
from models.upload import Upload, UploadStatus
from typing import Optional


def create(db: Session, account_id: int, filename: str) -> Upload:
    upload = Upload(account_id=account_id, filename=filename, status=UploadStatus.PENDING)
    db.add(upload)
    db.commit()
    db.refresh(upload)
    return upload


def get_by_id(db: Session, upload_id: int) -> Optional[Upload]:
    return db.query(Upload).filter(Upload.id == upload_id).first()


def get_all(db: Session) -> list[Upload]:
    return db.query(Upload).order_by(Upload.uploaded_at.desc()).all()


def update_status(db: Session, upload_id: int, status: UploadStatus,
                  rows_found: int = 0, rows_saved: int = 0,
                  rows_duplicate: int = 0, error_message: Optional[str] = None) -> Optional[Upload]:
    upload = get_by_id(db, upload_id)
    if not upload:
        return None
    upload.status = status
    if rows_found:
        upload.rows_found = rows_found
    if rows_saved:
        upload.rows_saved = rows_saved
    if rows_duplicate:
        upload.rows_duplicate = rows_duplicate
    if error_message:
        upload.error_message = error_message
    db.commit()
    db.refresh(upload)
    return upload
