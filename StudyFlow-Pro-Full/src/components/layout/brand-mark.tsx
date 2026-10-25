/** Logo vector nội bộ: không tải ảnh bên ngoài, không ảnh hưởng Auth/Firestore. */
interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className = '' }: BrandMarkProps) {
  return (
    <img
      src="/vantien-mark.svg"
      width={48}
      height={48}
      className={`block shrink-0 select-none ${className}`}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
