import { useEffect, useState, type ComponentType } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Content,
  GlobalTheme,
  Theme,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  SideNav,
  SideNavDivider,
  SideNavItems,
  SideNavLink,
  SkipToContent,
} from '@carbon/react'
import { Asleep, Launch, Light, Logout } from '@carbon/icons-react'
import { useAuth } from '@/lib/auth'
import ThemeSheet from '@/shared/ThemeSheet'
import FeedbackProvider from './feedback'
import dashboardCss from './dashboard.scss?inline'

export type DashboardLink = { to: string; label: string; icon: ComponentType; end?: boolean }

const THEME_KEY = 'sentrypass_dashboard_theme'

function initialTheme(): 'white' | 'g100' {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'white' || saved === 'g100') return saved
  } catch {
    /* private window: fall through to the system setting */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'g100' : 'white'
}

/**
 * The frame around every organiser and admin page: a header with the account and a light/dark switch,
 * a side menu with the sections, and room for the page. The side menu folds away behind a button on small screens.
 */
export default function DashboardLayout({
  area,
  base,
  links,
  crossLink,
}: {
  area: string
  base: string
  links: DashboardLink[]
  /** A shortcut to the other area, for people who may use both. */
  crossLink?: { to: string; label: string }
}) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [theme, setTheme] = useState<'white' | 'g100'>(initialTheme)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* the choice just is not remembered */
    }
  }, [theme])

  // Going to another page closes the side menu on a phone.
  useEffect(() => setMenuOpen(false), [pathname])

  const isCurrent = (l: DashboardLink) => (l.end ? pathname === l.to : pathname.startsWith(l.to))
  const dark = theme === 'g100'

  return (
    <ThemeSheet id="dashboard" css={dashboardCss}>
      <GlobalTheme theme={theme}>
        <Theme theme={theme} className="dash-root">
        <FeedbackProvider>
          <Header aria-label={`SentryPass ${area}`}>
            <SkipToContent />
            <HeaderMenuButton aria-label={menuOpen ? 'Close menu' : 'Open menu'} isActive={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
            <HeaderName as={Link} to={base} prefix="SentryPass">
              {area}
            </HeaderName>
            <HeaderGlobalBar>
              <span className="who-name">{user?.name}</span>
              <HeaderGlobalAction aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} tooltipAlignment="end" onClick={() => setTheme(dark ? 'white' : 'g100')}>
                {dark ? <Light size={20} /> : <Asleep size={20} />}
              </HeaderGlobalAction>
              <HeaderGlobalAction aria-label="Open the public site" tooltipAlignment="end" onClick={() => navigate('/')}>
                <Launch size={20} />
              </HeaderGlobalAction>
              <HeaderGlobalAction aria-label="Sign out" tooltipAlignment="end" onClick={() => signOut().then(() => navigate('/login', { replace: true }))}>
                <Logout size={20} />
              </HeaderGlobalAction>
            </HeaderGlobalBar>

            <SideNav aria-label="Sections" expanded={menuOpen} isPersistent onOverlayClick={() => setMenuOpen(false)}>
              <SideNavItems>
                {links.map((l) => (
                  <SideNavLink key={l.to} as={Link} to={l.to} renderIcon={l.icon} isActive={isCurrent(l)}>
                    {l.label}
                  </SideNavLink>
                ))}
                {crossLink && (
                  <>
                    <SideNavDivider />
                    <SideNavLink as={Link} to={crossLink.to} renderIcon={Launch}>
                      {crossLink.label}
                    </SideNavLink>
                  </>
                )}
              </SideNavItems>
            </SideNav>
          </Header>

          <Content id="main-content" className="dash-content">
            <div className="page">
              <Outlet />
            </div>
          </Content>
        </FeedbackProvider>
        </Theme>
      </GlobalTheme>
    </ThemeSheet>
  )
}
