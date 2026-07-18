import {
  Building2,
  CreditCard,
  FileText,
  ScrollText,
  LayoutDashboard,
  Wallet,
  type LucideIcon,
  LineChart,
  PlusSquare,
  List,
} from 'lucide-react'

export type AppRouteMeta = {
  title: string
  subtitle?: string
}

export type NavigationItem = AppRouteMeta & {
  href: string
  icon: LucideIcon
}

export const navigationItems: NavigationItem[] = [
  {
    href: '/',
    title: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/agencies',
    title: 'Agencies',
    subtitle: 'Manage parent agencies, branch relationships, and finance-ready profiles',
    icon: Building2,
  },
  {
    href: '/groups/add',
    title: 'Add Groups',
    subtitle: 'Create new group batches for the selected agency',
    icon: PlusSquare,
  },
  {
    href: '/groups',
    title: 'Group List',
    subtitle: 'Search, filter, and manage existing groups',
    icon: List,
  },
  {
    href: '/payments',
    title: 'Payments',
    subtitle: 'Review the payment ledger and allocation flow',
    icon: CreditCard,
  },
  {
    href: '/reports',
    title: 'Reports',
    subtitle: 'See live summaries across agencies, trips, and cash flow',
    icon: LineChart,
  },
  {
    href: '/reports/agency',
    title: 'Agency Report',
    subtitle: 'Review one agency with groups, payments, and export actions',
    icon: FileText,
  },
  {
    href: '/reports/agency-ledger',
    title: 'Agency Ledger',
    subtitle: 'Track agency transactions, balances, printing, and PDF export',
    icon: ScrollText,
  },
  {
    href: '/reports/outstanding-balances',
    title: 'Outstanding Balances',
    subtitle: 'Identify unpaid agencies, sort balances, and take action fast',
    icon: Wallet,
  },
]

export const routeMetaByPath = new Map(
  navigationItems.map((item) => [item.href, { title: item.title, subtitle: item.subtitle }]),
)
