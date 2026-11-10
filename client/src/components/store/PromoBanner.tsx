import { Link } from 'react-router-dom'

interface Props {
  image: string
  alt: string
  title: string
  text: string
  cta: string
  to: string
}

/** A full-width photograph with a white card centred on it. */
export default function PromoBanner({ image, alt, title, text, cta, to }: Props) {
  return (
    <section className="relative flex min-h-[645px] items-center justify-center overflow-hidden px-5 py-[60px] lg:min-h-[681px]">
      <img src={image} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <div className="relative w-full max-w-[740px] bg-white p-[30px] text-center min-[420px]:p-[50px]">
        <h2 className="text-[30px] font-medium uppercase leading-[1.3] text-black md:text-[46px] lg:text-[60px]">{title}</h2>
        <p className="mt-[22px] text-[18px] leading-[1.8] sm:text-[20px]">{text}</p>
        <Link to={to} className="st-btn mt-10">{cta}</Link>
      </div>
    </section>
  )
}
