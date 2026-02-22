import {
  Activity,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  GraduationCap,
  Inbox,
  KeyRound,
  Layers,
  LayoutDashboard,
  LineChart,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  Users,
} from "lucide-react";

export type SidebarRoleKey =
  | "admin"
  | "staff"
  | "teacher"
  | "student"
  | "osas"
  | "treasury";

export type SidebarRoleNavItem = {
  id: string;
  label: string;
  path: string;
  icon: any;
};

export type SidebarRoleMenu = {
  key: SidebarRoleKey;
  label: string;
  icon: any;
  navItems: SidebarRoleNavItem[];
};

export const GLOBAL_ROLE_SIDEBAR_MENUS: SidebarRoleMenu[] = [
  {
    key: "admin",
    label: "Admin",
    icon: ShieldCheck,
    navItems: [
      { id: "overview", label: "Overview", path: "/admin/dashboard/overview", icon: LayoutDashboard },
      { id: "manage_user", label: "Manage Users", path: "/admin/dashboard/manage_user", icon: UserCog },
      { id: "account_access", label: "Account Access", path: "/admin/dashboard/account_access", icon: KeyRound },
      { id: "pending_approval", label: "Pending Approval", path: "/admin/dashboard/pending_approval", icon: Inbox },
      { id: "status_logs", label: "Status Logs", path: "/admin/dashboard/status_logs", icon: Activity },
      { id: "settings", label: "Settings", path: "/admin/dashboard/settings", icon: Settings },
    ],
  },
  {
    key: "staff",
    label: "Staff",
    icon: Briefcase,
    navItems: [
      { id: "study_load", label: "Study Load", path: "/nt/dashboard/study_load", icon: ClipboardList },
      { id: "manage_students", label: "Manage Students", path: "/nt/dashboard/manage_students", icon: Users },
      { id: "teacher_scheduling", label: "Teacher Scheduling", path: "/nt/dashboard/teacher_scheduling", icon: CalendarCheck },
      { id: "subjects", label: "Subjects", path: "/nt/dashboard/subjects", icon: BookOpen },
      { id: "sections", label: "Sections", path: "/nt/dashboard/sections", icon: Layers },
      { id: "irregular_study_load", label: "Irregular Study Load", path: "/nt/dashboard/irregular_study_load", icon: BookOpen },
      { id: "buildings", label: "Buildings", path: "/nt/dashboard/buildings", icon: Building2 },
      { id: "settings", label: "Settings", path: "/nt/dashboard/settings", icon: Settings },
    ],
  },
  {
    key: "teacher",
    label: "Teacher",
    icon: BookOpen,
    navItems: [
      { id: "schedule", label: "Schedule", path: "/teachers/schedule", icon: CalendarCheck },
      { id: "announcements", label: "Announcements", path: "/teachers/announcements", icon: Megaphone },
      { id: "transparency", label: "Transparency", path: "/teachers/transparency", icon: LineChart },
      { id: "grade_system", label: "Grade System", path: "/teachers/grade_system", icon: GraduationCap },
      { id: "evaluation", label: "Evaluation", path: "/teachers/evaluation", icon: ClipboardCheck },
      { id: "settings", label: "Settings", path: "/teachers/settings", icon: Settings },
    ],
  },
  {
    key: "student",
    label: "Student",
    icon: GraduationCap,
    navItems: [
      { id: "records", label: "My Records", path: "/home/records", icon: FileText },
      { id: "announcements", label: "Announcements", path: "/home/announcements", icon: Megaphone },
      { id: "grades", label: "Grades", path: "/home/grades", icon: Award },
      { id: "evaluation", label: "Evaluation", path: "/home/evaluation", icon: ClipboardCheck },
      { id: "feedback", label: "Feedback", path: "/home/feedback", icon: MessageSquare },
      { id: "settings", label: "Settings", path: "/home/settings", icon: Settings },
    ],
  },
  {
    key: "osas",
    label: "Osas",
    icon: ShieldAlert,
    navItems: [
      { id: "announcements", label: "Announcements", path: "/nt/dashboard/announcements", icon: Megaphone },
      { id: "projects", label: "Projects", path: "/nt/dashboard/projects", icon: FolderKanban },
      { id: "warning", label: "Warnings", path: "/nt/dashboard/warning", icon: ShieldAlert },
      { id: "sanction", label: "Sanctions", path: "/nt/dashboard/sanction", icon: ShieldAlert },
      { id: "record", label: "Records", path: "/nt/dashboard/record", icon: BookOpen },
    ],
  },
  {
    key: "treasury",
    label: "Treasury",
    icon: CreditCard,
    navItems: [
      { id: "announcements", label: "Announcements", path: "/nt/dashboard/announcements", icon: Megaphone },
      { id: "projects", label: "Projects", path: "/nt/dashboard/projects", icon: FolderKanban },
      { id: "payment", label: "Payments", path: "/nt/dashboard/payment", icon: CreditCard },
      { id: "record", label: "Records", path: "/nt/dashboard/record", icon: BookOpen },
    ],
  },
];
