'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-50 to-purple-50 py-20">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h1 className="text-5xl font-bold mb-6 text-indigo-900">Easy Reading</h1>
          <p className="text-xl text-gray-600 mb-8">
            Read English articles effortlessly with translation, text to speech and
            vocabulary tools.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/" className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow hover:bg-indigo-500 transition">
              Try Reader
            </Link>
            {/* <Link href="/pricing" className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-50 transition">
              Pricing
            </Link> */}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          <div className="p-6 rounded-lg shadow hover:shadow-md transition">
            <h3 className="font-semibold text-lg mb-2">Smart Translation</h3>
            <p className="text-gray-600">Translate selected text instantly while you read.</p>
          </div>
          <div className="p-6 rounded-lg shadow hover:shadow-md transition">
            <h3 className="font-semibold text-lg mb-2">Text To Speech</h3>
            <p className="text-gray-600">Listen to articles with natural pronunciation.</p>
          </div>
          <div className="p-6 rounded-lg shadow hover:shadow-md transition">
            <h3 className="font-semibold text-lg mb-2">Word Book</h3>
            <p className="text-gray-600">Save new vocabulary and review anytime.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-violet-600 to-indigo-600 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
        <p className="mb-8 text-purple-100">Install the extension and begin your journey.</p>
        <Link href="/" className="bg-white text-indigo-700 px-8 py-4 rounded-lg font-semibold hover:bg-purple-50 transition">
          Start Reading
        </Link>
      </section>
    </div>
  );
}
