import RotatingEarth from "@/components/rotating-earth"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1a1a1a] flex justify-center items-center">
          <RotatingEarth width={700} height={500}/>
    </main>
  )
}
