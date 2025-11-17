"use client"

import type React from "react"
import { useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { Users, Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Bucket } from "@/app/contacts/contexts/contacts-context"

interface ContactBucketCarouselProps {
  buckets: Bucket[]
  selectedBucketId: string | null
  onSelectBucket: (bucketId: string | null) => void
}

const ContactBucketCarousel: React.FC<ContactBucketCarouselProps> = ({ buckets, selectedBucketId, onSelectBucket }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
  })
  const [searchQuery, setSearchQuery] = useState("")

  const filteredBuckets = (buckets || []).filter((bucket) =>
    bucket.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleSelect = (bucketId: string) => {
    if (selectedBucketId === bucketId) {
      onSelectBucket(null)
    } else {
      onSelectBucket(bucketId)
    }
  }

  const formatNumber = (index: number) => {
    return (index + 1).toString().padStart(2, "0")
  }

  const renderCard = (bucket: Bucket, index: number) => {
    const isSelected = selectedBucketId === bucket.id
    const colorIndex = index % 4

    // Blue card
    if (colorIndex === 0) {
      return (
        <div
          key={bucket.id}
          onClick={() => handleSelect(bucket.id)}
          className={cn(
            "group h-28 w-40 cursor-pointer border-2 border-blue-500 rounded-lg transition-all duration-200 hover:bg-blue-500",
            isSelected ? "ring-2 ring-gray-400" : "",
          )}
        >
          <div className="absolute top-2 left-2">
            <div className="text-3xl font-bold leading-none text-blue-500 group-hover:text-white transition-colors duration-200 font-mono">
              {formatNumber(index)}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-sm font-bold uppercase tracking-wide leading-tight text-blue-500 group-hover:text-white transition-colors duration-200 font-mono">
              {bucket.name}
            </h3>
            <div className="flex items-center space-x-1 mt-1 text-blue-500 group-hover:text-white transition-colors duration-200">
              <Users className="h-3 w-3" />
              <span className="text-xs font-medium font-mono">{bucket.count}</span>
            </div>
          </div>
        </div>
      )
    }

    // Yellow card
    if (colorIndex === 1) {
      return (
        <div
          key={bucket.id}
          onClick={() => handleSelect(bucket.id)}
          className={cn(
            "group h-28 w-40 cursor-pointer border-2 border-yellow-400 rounded-lg transition-all duration-200 hover:bg-yellow-400",
            isSelected ? "ring-2 ring-gray-400" : "",
          )}
        >
          <div className="absolute top-2 left-2">
            <div className="text-3xl font-bold leading-none text-yellow-600 group-hover:text-black transition-colors duration-200 font-mono">
              {formatNumber(index)}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-sm font-bold uppercase tracking-wide leading-tight text-yellow-600 group-hover:text-black transition-colors duration-200 font-mono">
              {bucket.name}
            </h3>
            <div className="flex items-center space-x-1 mt-1 text-yellow-600 group-hover:text-black transition-colors duration-200">
              <Users className="h-3 w-3" />
              <span className="text-xs font-medium font-mono">{bucket.count}</span>
            </div>
          </div>
        </div>
      )
    }

    // Red card
    if (colorIndex === 2) {
      return (
        <div
          key={bucket.id}
          onClick={() => handleSelect(bucket.id)}
          className={cn(
            "group h-28 w-40 cursor-pointer border-2 border-red-500 rounded-lg transition-all duration-200 hover:bg-red-500",
            isSelected ? "ring-2 ring-gray-400" : "",
          )}
        >
          <div className="absolute top-2 left-2">
            <div className="text-3xl font-bold leading-none text-red-500 group-hover:text-white transition-colors duration-200 font-mono">
              {formatNumber(index)}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-sm font-bold uppercase tracking-wide leading-tight text-red-500 group-hover:text-white transition-colors duration-200 font-mono">
              {bucket.name}
            </h3>
            <div className="flex items-center space-x-1 mt-1 text-red-500 group-hover:text-white transition-colors duration-200">
              <Users className="h-3 w-3" />
              <span className="text-xs font-medium font-mono">{bucket.count}</span>
            </div>
          </div>
        </div>
      )
    }

    // Green card
    return (
      <div
        key={bucket.id}
        onClick={() => handleSelect(bucket.id)}
        className={cn(
          "group h-28 w-40 cursor-pointer border-2 border-green-500 rounded-lg transition-all duration-200 hover:bg-green-500",
          isSelected ? "ring-2 ring-gray-400" : "",
        )}
      >
        <div className="absolute top-2 left-2">
          <div className="text-3xl font-bold leading-none text-green-500 group-hover:text-white transition-colors duration-200 font-mono">
            {formatNumber(index)}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-sm font-bold uppercase tracking-wide leading-tight text-green-500 group-hover:text-white transition-colors duration-200 font-mono">
            {bucket.name}
          </h3>
          <div className="flex items-center space-x-1 mt-1 text-green-500 group-hover:text-white transition-colors duration-200">
            <Users className="h-3 w-3" />
            <span className="text-xs font-medium font-mono">{bucket.count}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search buckets..."
          className="pl-12 h-12 text-base border border-gray-200 rounded-lg bg-white placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200 transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex space-x-4">
          {filteredBuckets.map((bucket, index) => (
            <div key={bucket.id} className="flex-[0_0_160px] min-w-0 relative">
              {renderCard(bucket, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ContactBucketCarousel
