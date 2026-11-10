import { Link } from 'react-router-dom'

/** Real photographs of the shop — no stock imagery. */
const PHOTOS = [
  { src: '/shop/shop-05.jpg', alt: 'Phones on display along the shop wall' },
  { src: '/shop/shop-06.jpg', alt: 'Chargers and cables on the accessories wall' },
  { src: '/shop/shop-08.jpg', alt: 'Shelves of boxed accessories inside the shop' },
  { src: '/shop/shop-17.jpg', alt: 'Cases and screen guards hanging at the counter' },
  { src: '/shop/shop-21.jpg', alt: 'Accessory racks inside Vaishnavi Mobile Point' },
]

/**
 * A strip of square photographs of the shop itself, sitting just above the
 * footer: five across on large screens, a swipeable row below that.
 */
export default function ShopGallery() {
  return (
    <section className="bg-white pb-[15px] pt-[45px] lg:pt-[60px]" aria-labelledby="gallery-title">
      <div className="st-container">
        <h2 id="gallery-title" className="st-title">#Inside our shop</h2>
        <p className="mt-2.5 text-center text-[20px] leading-[1.8] text-[var(--st-accent-ink)] lg:text-[24px]">
          Churi Centre Gali, Ratu Road
        </p>

        <ul className="st-scroll-row mt-[35px] grid snap-x snap-mandatory auto-cols-[calc((100%-15px)/2.2)] grid-flow-col gap-[15px] overflow-x-auto sm:auto-cols-[calc((100%-30px)/3.2)] lg:grid-flow-row lg:grid-cols-5 lg:overflow-visible">
          {PHOTOS.map((photo) => (
            <li key={photo.src} className="snap-start">
              <Link to="/about" className="group block aspect-square overflow-hidden" aria-label={`${photo.alt} — about the shop`}>
                <img
                  src={photo.src}
                  alt={photo.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
