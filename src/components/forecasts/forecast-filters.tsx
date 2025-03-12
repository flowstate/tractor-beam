'use client'
import { Fragment, useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid'

const locations = [
  { id: 'all', name: 'All Locations' },
  { id: 'west', name: 'West' },
  { id: 'south', name: 'South' },
  { id: 'heartland', name: 'Heartland' },
]

const models = [
  { id: 'all', name: 'All Models' },
  { id: 'TX-100', name: 'TX-100' },
  { id: 'TX-300', name: 'TX-300' },
  { id: 'TX-500', name: 'TX-500' },
]

const timePeriods = [
  { id: '2q', name: 'Next 2 Quarters' },
  { id: '1q', name: 'Next Quarter' },
  { id: '6m', name: 'Next 6 Months' },
]

export default function ForecastFilters() {
  const [selectedLocation, setSelectedLocation] = useState(locations[0])
  const [selectedModel, setSelectedModel] = useState(models[0])
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(timePeriods[0])

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-4">
        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Location
          </label>
          <Listbox value={selectedLocation} onChange={setSelectedLocation}>
            <div className="relative mt-1">
              <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm">
                <span className="block truncate">{selectedLocation.name}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronDownIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {locations.map((location) => (
                    <Listbox.Option
                      key={location.id}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                        }`
                      }
                      value={location}
                    >
                      {({ selected }) => (
                        <>
                          <span
                            className={`block truncate ${
                              selected ? 'font-medium' : 'font-normal'
                            }`}
                          >
                            {location.name}
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>

        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Model
          </label>
          <Listbox value={selectedModel} onChange={setSelectedModel}>
            <div className="relative mt-1">
              <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm">
                <span className="block truncate">{selectedModel.name}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronDownIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {models.map((model) => (
                    <Listbox.Option
                      key={model.id}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                        }`
                      }
                      value={model}
                    >
                      {({ selected }) => (
                        <>
                          <span
                            className={`block truncate ${
                              selected ? 'font-medium' : 'font-normal'
                            }`}
                          >
                            {model.name}
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>

        <div className="w-full sm:w-auto">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Time Period
          </label>
          <Listbox value={selectedTimePeriod} onChange={setSelectedTimePeriod}>
            <div className="relative mt-1">
              <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm">
                <span className="block truncate">
                  {selectedTimePeriod.name}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronDownIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
              </Listbox.Button>
              <Transition
                as={Fragment}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {timePeriods.map((period) => (
                    <Listbox.Option
                      key={period.id}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                        }`
                      }
                      value={period}
                    >
                      {({ selected }) => (
                        <>
                          <span
                            className={`block truncate ${
                              selected ? 'font-medium' : 'font-normal'
                            }`}
                          >
                            {period.name}
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
        </div>
      </div>
    </div>
  )
}
