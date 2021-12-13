// Types
type User = {
  id: Number
  name: string
}

type Instrument = {
  id: Number
  isin: string
  name: string
  country: string
  currency: string
}

type Capsule = {
  id: Number
  capsule_class: string
  capsule_key: string
}

type Event = {
  id: Number
  capsule_id: Number
  target_id: Number
  user_id: Number
  date: Date
  type: 'propose' | 'approve' | 'reject'
  source: 'manual' | 'bloomberg' | 'reuters'
  resolution_status: 'rejected' | 'pending' | 'approved'
  resolution_date: Date
  resolution_user_id: Number
}

// State
const users = [
  { id: 0, name: 'valentin' },
  { id: 1, name: 'clement' },
]
const instruments = []
const capsules = []
const events = []

// Functions
function login(user: User): string {
  return user.name
}

function propose(instrument: Instrument, source: string): number {
  return 1
}

function approve(event_id: Number): void {
}

function reject(event_id: Number): void {
}

function candidates(unique_key: string): [[Instrument, Event, Capsule]] {
  return [instruments[0], events[0], capsules[0]]
}

function golden(unique_key: string): [Instrument, Event, Capsule] {
  return 
}

function get(): any {
  const user = {id: 1, name: 'John'}
  const instrument = {id: 1, isin: 'US0378331005', name: 'Apple', country: 'USA', currency: 'USD'}
  const capsule = {id: 1, capsule_class: 'instrument', capsule_key: 'AAPL'}
  const event = {id: 1, capsule_id: 1, target_id: 1, user_id: 1, date: new Date(), type: 'propose', source: 'manual', resolution_status: 'pending', resolution_date: new Date(), resolution_user_id: 1}
  const candidates = [[instrument, event, capsule]]
  const golden = [instrument, event, capsule]
  return
}

function set(klass: string, object: any): void {
}

// Run
const token = login(users[0])

// approve(event_id): void
// reject(event_id): void

// candidates(unique_key): [instrument]
// golden(unique_key): instrument

// get(unique_key, filter): instrument JOIN event JOIN capsule
// get('FR001', { source: 'manuel' }, { limit: 1 }) > status 'pending' donc point rouge
