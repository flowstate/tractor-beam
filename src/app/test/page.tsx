'use client'

import React from 'react'
import {
  FadeIn,
  ZoomIn,
  SlideIn,
  Sequence,
  Parallax,
} from '~/components/animations/scroll-animations'
import { ScrollScene, ScrollPin } from '~/components/animations/scroll-scene'

export default function AnimationTestPage() {
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-3xl font-bold">Scroll Animation Test Page</h1>
      <p className="mb-12 text-gray-600">
        Scroll down to see different animation effects in action. Each section
        demonstrates a different animation component with various
        configurations.
      </p>

      {/* FadeIn Variations */}
      <section className="mb-32">
        <h2 className="mb-6 text-2xl font-semibold">FadeIn Variations</h2>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="mb-4 text-lg font-medium">FadeIn (up)</h3>
            <FadeIn direction="up">
              <div className="h-40 rounded-lg bg-blue-500 p-4 text-white">
                Fades in from below
              </div>
            </FadeIn>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">FadeIn (down)</h3>
            <FadeIn direction="down">
              <div className="h-40 rounded-lg bg-green-500 p-4 text-white">
                Fades in from above
              </div>
            </FadeIn>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">FadeIn (left)</h3>
            <FadeIn direction="left">
              <div className="h-40 rounded-lg bg-purple-500 p-4 text-white">
                Fades in from the right
              </div>
            </FadeIn>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">FadeIn (right)</h3>
            <FadeIn direction="right">
              <div className="h-40 rounded-lg bg-orange-500 p-4 text-white">
                Fades in from the left
              </div>
            </FadeIn>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">FadeIn (long distance)</h3>
            <FadeIn direction="up" distance={100}>
              <div className="h-40 rounded-lg bg-red-500 p-4 text-white">
                Fades in from further below
              </div>
            </FadeIn>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">FadeIn (slow)</h3>
            <FadeIn direction="up" duration={1.5}>
              <div className="h-40 rounded-lg bg-indigo-500 p-4 text-white">
                Fades in slowly
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ZoomIn Variations */}
      <section className="mb-32">
        <h2 className="mb-6 text-2xl font-semibold">ZoomIn Variations</h2>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="mb-4 text-lg font-medium">ZoomIn (default)</h3>
            <ZoomIn>
              <div className="h-40 rounded-lg bg-teal-500 p-4 text-white">
                Zooms in from 80%
              </div>
            </ZoomIn>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">ZoomIn (small)</h3>
            <ZoomIn scale={0.5}>
              <div className="h-40 rounded-lg bg-pink-500 p-4 text-white">
                Zooms in from 50%
              </div>
            </ZoomIn>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">ZoomIn (large)</h3>
            <ZoomIn scale={1.5}>
              <div className="h-40 rounded-lg bg-yellow-500 p-4 text-white">
                Zooms in from 150%
              </div>
            </ZoomIn>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">ZoomIn (slow)</h3>
            <ZoomIn duration={1.5}>
              <div className="h-40 rounded-lg bg-cyan-500 p-4 text-white">
                Zooms in slowly
              </div>
            </ZoomIn>
          </div>
        </div>
      </section>

      {/* SlideIn Variations */}
      <section className="mb-32">
        <h2 className="mb-6 text-2xl font-semibold">SlideIn Variations</h2>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="mb-4 text-lg font-medium">SlideIn (left)</h3>
            <SlideIn from="left">
              <div className="h-40 rounded-lg bg-emerald-500 p-4 text-white">
                Slides in from left
              </div>
            </SlideIn>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">SlideIn (right)</h3>
            <SlideIn from="right">
              <div className="h-40 rounded-lg bg-amber-500 p-4 text-white">
                Slides in from right
              </div>
            </SlideIn>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">SlideIn (top)</h3>
            <SlideIn from="top">
              <div className="h-40 rounded-lg bg-lime-500 p-4 text-white">
                Slides in from top
              </div>
            </SlideIn>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">SlideIn (bottom)</h3>
            <SlideIn from="bottom">
              <div className="h-40 rounded-lg bg-fuchsia-500 p-4 text-white">
                Slides in from bottom
              </div>
            </SlideIn>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">
              SlideIn (long distance)
            </h3>
            <SlideIn from="left" distance={200}>
              <div className="h-40 rounded-lg bg-rose-500 p-4 text-white">
                Slides in from further left
              </div>
            </SlideIn>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">SlideIn (slow)</h3>
            <SlideIn from="right" duration={1.5}>
              <div className="h-40 rounded-lg bg-sky-500 p-4 text-white">
                Slides in slowly
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* Sequence Variations */}
      <section className="mb-32">
        <h2 className="mb-6 text-2xl font-semibold">Sequence Variations</h2>

        <div className="grid grid-cols-1 gap-8">
          <div>
            <h3 className="mb-4 text-lg font-medium">Sequence (fade)</h3>
            <Sequence animation="fade" direction="up" staggerDelay={0.2}>
              <div className="h-20 rounded-lg bg-blue-400 p-4 text-white">
                Item 1
              </div>
              <div className="h-20 rounded-lg bg-blue-500 p-4 text-white">
                Item 2
              </div>
              <div className="h-20 rounded-lg bg-blue-600 p-4 text-white">
                Item 3
              </div>
              <div className="h-20 rounded-lg bg-blue-700 p-4 text-white">
                Item 4
              </div>
            </Sequence>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">Sequence (zoom)</h3>
            <Sequence animation="zoom" staggerDelay={0.2}>
              <div className="h-20 rounded-lg bg-green-400 p-4 text-white">
                Item 1
              </div>
              <div className="h-20 rounded-lg bg-green-500 p-4 text-white">
                Item 2
              </div>
              <div className="h-20 rounded-lg bg-green-600 p-4 text-white">
                Item 3
              </div>
              <div className="h-20 rounded-lg bg-green-700 p-4 text-white">
                Item 4
              </div>
            </Sequence>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">Sequence (slide)</h3>
            <Sequence animation="slide" from="right" staggerDelay={0.2}>
              <div className="h-20 rounded-lg bg-purple-400 p-4 text-white">
                Item 1
              </div>
              <div className="h-20 rounded-lg bg-purple-500 p-4 text-white">
                Item 2
              </div>
              <div className="h-20 rounded-lg bg-purple-600 p-4 text-white">
                Item 3
              </div>
              <div className="h-20 rounded-lg bg-purple-700 p-4 text-white">
                Item 4
              </div>
            </Sequence>
          </div>
        </div>
      </section>

      {/* Parallax Effect */}
      <section className="mb-32">
        <h2 className="mb-6 text-2xl font-semibold">Parallax Effect</h2>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="mb-4 text-lg font-medium">Parallax (slow)</h3>
            <Parallax speed={0.2}>
              <div className="h-40 rounded-lg bg-orange-500 p-4 text-white">
                Moves slowly as you scroll
              </div>
            </Parallax>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">Parallax (fast)</h3>
            <Parallax speed={0.8}>
              <div className="h-40 rounded-lg bg-red-500 p-4 text-white">
                Moves quickly as you scroll
              </div>
            </Parallax>
          </div>
        </div>
      </section>

      {/* Combined Effects */}
      <section className="mb-32">
        <h2 className="mb-6 text-2xl font-semibold">Combined Effects</h2>

        <FadeIn direction="up">
          <div className="mb-8 rounded-lg bg-gray-100 p-6">
            <h3 className="mb-4 text-xl font-medium">
              Card with Staggered Content
            </h3>

            <Sequence animation="fade" direction="up" staggerDelay={0.15}>
              <p className="mb-4">
                This is a card that fades in as a whole, but its contents also
                fade in with a staggered delay.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <SlideIn from="left">
                  <div className="h-32 rounded-lg bg-indigo-500 p-4 text-white">
                    Nested slide-in element
                  </div>
                </SlideIn>

                <ZoomIn>
                  <div className="h-32 rounded-lg bg-pink-500 p-4 text-white">
                    Nested zoom-in element
                  </div>
                </ZoomIn>
              </div>

              <p className="mt-4">
                This demonstrates how you can combine different animation
                effects for a rich experience.
              </p>
            </Sequence>
          </div>
        </FadeIn>

        <ZoomIn>
          <div className="rounded-lg bg-gray-800 p-6 text-white">
            <h3 className="mb-4 text-xl font-medium">
              Interactive Card Example
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <Sequence animation="slide" from="bottom" staggerDelay={0.2}>
                <div className="h-24 rounded-lg bg-blue-600 p-4">Step 1</div>
                <div className="h-24 rounded-lg bg-green-600 p-4">Step 2</div>
                <div className="h-24 rounded-lg bg-yellow-600 p-4">Step 3</div>
              </Sequence>
            </div>

            <SlideIn from="right" delay={0.5}>
              <p className="mt-4">
                This is how you might animate a multi-step process or dashboard
                card.
              </p>
            </SlideIn>
          </div>
        </ZoomIn>
      </section>

      {/* Advanced Scroll Scenes */}
      <section className="mb-32">
        <h2 className="mb-6 text-2xl font-semibold">Advanced Scroll Scenes</h2>

        <p className="mb-8 text-gray-600">
          Scroll down to see how elements can transform and exit based on scroll
          position. These effects create the narrative flow you described.
        </p>

        {/* Example 1: Header that shrinks and moves to top */}
        <ScrollPin pinFor={2}>
          <div className="relative h-screen w-full">
            <ScrollScene
              startAt={0}
              endAt={50}
              enterAnimation={{ opacity: [0, 1], scale: [0.5, 1] }}
              transformAnimation={{ scale: [1, 0.6], y: [0, -200] }}
            >
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-4xl font-bold text-blue-600">
                  Supplier Performance Analysis
                </h2>
                <p className="mt-4 text-xl text-gray-600">
                  Scroll down to explore how Bolt&apos;s quality has evolved
                  over time
                </p>
              </div>
            </ScrollScene>

            {/* Content that appears as you scroll */}
            <ScrollScene
              startAt={30}
              endAt={70}
              enterAnimation={{ opacity: [0, 1], x: [-100, 0] }}
              exitAnimation={{ opacity: [1, 0], x: [0, -100] }}
            >
              <div className="absolute left-10 top-1/2 w-1/3 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
                <h3 className="mb-2 text-xl font-semibold text-blue-700">
                  Quality Trends
                </h3>
                <p className="text-gray-700">
                  Bolt&apos;s quality index shows a clear pattern: initial
                  decline, followed by stabilization, and finally improvement in
                  the most recent period.
                </p>
              </div>
            </ScrollScene>

            <ScrollScene
              startAt={30}
              endAt={70}
              enterAnimation={{ opacity: [0, 1], x: [100, 0] }}
              exitAnimation={{ opacity: [1, 0], x: [0, 100] }}
            >
              <div className="absolute right-10 top-1/2 w-1/3 -translate-y-1/2 rounded-lg bg-blue-50 p-6 shadow-lg">
                <div className="h-40 rounded-lg bg-blue-500 p-4 text-white">
                  Chart placeholder
                </div>
              </div>
            </ScrollScene>

            {/* Second set of content */}
            <ScrollScene
              startAt={60}
              endAt={100}
              enterAnimation={{ opacity: [0, 1], x: [-100, 0] }}
            >
              <div className="absolute left-10 top-1/2 w-1/3 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
                <h3 className="mb-2 text-xl font-semibold text-green-700">
                  Future Projections
                </h3>
                <p className="text-gray-700">
                  Based on recent trends, we project continued improvement in
                  Bolt&apos;s quality metrics over the next two quarters.
                </p>
              </div>
            </ScrollScene>

            <ScrollScene
              startAt={60}
              endAt={100}
              enterAnimation={{ opacity: [0, 1], x: [100, 0] }}
            >
              <div className="absolute right-10 top-1/2 w-1/3 -translate-y-1/2 rounded-lg bg-green-50 p-6 shadow-lg">
                <div className="h-40 rounded-lg bg-green-500 p-4 text-white">
                  Forecast chart placeholder
                </div>
              </div>
            </ScrollScene>
          </div>
        </ScrollPin>

        <div className="h-screen bg-gray-100 p-8">
          <h3 className="text-2xl font-bold">Next Section</h3>
          <p>This demonstrates how we can transition between full sections.</p>
        </div>
      </section>

      {/* Final Section */}
      <section className="mb-16 text-center">
        <FadeIn direction="up">
          <h2 className="mb-4 text-2xl font-semibold">
            Ready to Use in Your Project
          </h2>
          <p className="text-gray-600">
            These animation components are ready to be used in your supplier
            visualization. They&apos;ll help create an engaging,
            narrative-driven experience for your users.
          </p>
        </FadeIn>
      </section>
    </div>
  )
}
