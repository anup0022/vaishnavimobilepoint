import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SettingsProvider } from './lib/useSettings'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import ThemeSync from './components/ThemeSync'

import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Services from './pages/Services'
import Book from './pages/Book'
import Track from './pages/Track'
import Feedback from './pages/Feedback'
import Contact from './pages/Contact'
import About from './pages/About'
import Faq from './pages/Faq'
import NotFound from './pages/NotFound'

/*
 * The CMS used to ship inside the customer's bundle: seven screens that only
 * the shop staff can reach, downloaded by every shopper in Ranchi on mobile
 * data. Split out, it is fetched only when someone actually opens /admin.
 */
const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const Login = lazy(() => import('./admin/Login'))
const Dashboard = lazy(() => import('./admin/Dashboard'))
const Stock = lazy(() => import('./admin/Stock'))
const Bookings = lazy(() => import('./admin/Bookings'))
const Reviews = lazy(() => import('./admin/Reviews'))
const Messages = lazy(() => import('./admin/Messages'))
const SiteSettings = lazy(() => import('./admin/SiteSettings'))

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="shimmer h-10 w-40 rounded-xl" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeSync />
      <SettingsProvider>
        <ToastProvider>
          <Routes>
            {/* Public storefront */}
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:slug" element={<ProductDetail />} />
              <Route path="services" element={<Services />} />
              <Route path="book" element={<Book />} />
              <Route path="track" element={<Track />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="contact" element={<Contact />} />
              <Route path="about" element={<About />} />
              <Route path="faq" element={<Faq />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Staff CMS — gated behind a login, never linked from the shop nav */}
            <Route
              path="/admin/login"
              element={
                <Suspense fallback={<AdminFallback />}>
                  <Login />
                </Suspense>
              }
            />
            <Route
              path="/admin"
              element={
                <Suspense fallback={<AdminFallback />}>
                  <AdminLayout />
                </Suspense>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="stock" element={<Stock />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="messages" element={<Messages />} />
              <Route path="settings" element={<SiteSettings />} />
            </Route>
          </Routes>
        </ToastProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}
