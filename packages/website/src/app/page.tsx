'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white py-24">
        <div className="absolute inset-0 opacity-30 bg-[url('/hero.jpg')] bg-cover bg-center" />
        <div className="relative max-w-3xl mx-auto text-center px-4">
          <h1 className="text-6xl font-bold mb-6">Make English Reading Natural and Effortless</h1>
          <p className="text-xl mb-8">Tools that help you translate, listen and save words as you read.</p>
          <div className="flex justify-center gap-4">
            <Link href="/news" className="bg-white text-indigo-700 px-8 py-4 rounded-lg font-semibold hover:bg-indigo-50 transition">
              Read Now
            </Link>
            {/* <Link href="/pricing" className="border border-white text-white px-8 py-4 rounded-lg hover:bg-white/10 transition">
              Pricing
            </Link> */}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white" id="features">
        <h2 className="text-3xl font-bold text-center mb-12">Why choose English Reader?</h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 px-4">
          <div className="p-6 rounded-lg shadow hover:shadow-md transition text-center">
            <h3 className="font-semibold text-lg mb-2">Smart Translation</h3>
            <p className="text-gray-600">Translate any word or sentence instantly while you read.</p>
          </div>
          <div className="p-6 rounded-lg shadow hover:shadow-md transition text-center">
            <h3 className="font-semibold text-lg mb-2">Text To Speech</h3>
            <p className="text-gray-600">Listen to articles with natural pronunciation.</p>
          </div>
          <div className="p-6 rounded-lg shadow hover:shadow-md transition text-center">
            <h3 className="font-semibold text-lg mb-2">Word Book</h3>
            <p className="text-gray-600">Save new vocabulary and review it anytime.</p>
          </div>
          <div className="p-6 rounded-lg shadow hover:shadow-md transition text-center">
            <h3 className="font-semibold text-lg mb-2">Clean Layout</h3>
            <p className="text-gray-600">Remove clutter for a pleasant reading experience.</p>
          </div>
        </div>
      </section>

      {/* Mid CTA Section */}
      <section className="py-20 bg-indigo-700 text-center text-white px-4">
        <h2 className="text-3xl font-bold mb-4">Ready to Enhance Your Reading Experience?</h2>
        <p className="text-lg mb-8">Join thousands of users who are already enjoying effortless English reading.</p>
        <Link href="/news" className="bg-white text-indigo-700 px-8 py-4 rounded-lg font-semibold hover:bg-indigo-50 transition">
          Start Reading
        </Link>
      </section>

      {/* Reviews Section */}
      <section className="py-16 bg-gray-50" id="reviews">
        <h2 className="text-3xl font-bold text-center mb-12">What Our Users Say</h2>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
          <div className="p-6 bg-white rounded-lg shadow text-center">
            <p className="text-gray-700 mb-4">&quot;The translation feature helps me read articles I never thought I could.&quot;</p>
            <span className="font-semibold text-indigo-600">— Alice</span>
          </div>
          <div className="p-6 bg-white rounded-lg shadow text-center">
            <p className="text-gray-700 mb-4">&quot;Listening to articles on the go improved my pronunciation a lot.&quot;</p>
            <span className="font-semibold text-indigo-600">— Ben</span>
          </div>
          <div className="p-6 bg-white rounded-lg shadow text-center">
            <p className="text-gray-700 mb-4">&quot;Word Book keeps all my new vocabulary in one place. Love it!&quot;</p>
            <span className="font-semibold text-indigo-600">— Chen</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-violet-600 to-indigo-600 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
        <p className="mb-8 text-purple-100">Install the extension and begin your journey.</p>
        <Link href="/news" className="bg-white text-indigo-700 px-8 py-4 rounded-lg font-semibold hover:bg-purple-50 transition">
          Read Now
        </Link>
      </section>
    </div>
  );
}
