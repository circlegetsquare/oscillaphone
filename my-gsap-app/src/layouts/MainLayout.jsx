import NavBar from '../components/NavBar'

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="relative">
        {children}
      </main>
    </div>
  )
}
