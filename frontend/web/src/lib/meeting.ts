import type { MeetingPlatform } from './api'

const HOSTS: [MeetingPlatform, string[]][] = [
  ['zoom', ['zoom.us', 'zoom.com', 'zoomgov.com']],
  ['meet', ['meet.google.com']],
  ['teams', ['teams.microsoft.com', 'teams.live.com', 'teams.microsoft.us']],
  ['webex', ['webex.com']],
  ['discord', ['discord.gg', 'discord.com']],
  ['whatsapp', ['chat.whatsapp.com', 'call.whatsapp.com']],
  ['telegram', ['t.me', 'telegram.me']],
]

const NAME: Record<MeetingPlatform, string> = {
  zoom: 'Zoom',
  meet: 'Google Meet',
  teams: 'Microsoft Teams',
  webex: 'Webex',
  discord: 'Discord',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  other: 'Online meeting',
}

/** The same guess the server makes from a link, used to show the organiser what will be detected. */
export function detectPlatform(url: string): MeetingPlatform | null {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
  for (const [platform, hosts] of HOSTS) {
    if (hosts.some((h) => host === h || host.endsWith(`.${h}`))) return platform
  }
  return 'other'
}

export const platformName = (p: MeetingPlatform | null | undefined) => NAME[p ?? 'other']

/** The words on the button: "Join on Zoom", or just "Join meeting" for a service we do not know. */
export const joinLabel = (p: MeetingPlatform | null | undefined) => (p && p !== 'other' ? `Join on ${NAME[p]}` : 'Join meeting')
