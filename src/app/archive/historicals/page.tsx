import { GeneratedDataDashboard } from '~/app/_components/generated-data-dashboard'
import { HydrateClient } from '~/trpc/server'
import Link from 'next/link'

export default function HistoricalsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Historical Supply Chain Analysis
          </h1>
          <Link
            href="/"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <HydrateClient>
            <GeneratedDataDashboard />
          </HydrateClient>
        </div>
      </div>
    </main>
  )
}
