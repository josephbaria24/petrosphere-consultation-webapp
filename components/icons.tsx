/**
 * Hugeicons (Iconify) SVG icons — Lucide-compatible drop-in API.
 * Icon set: https://icon-sets.iconify.design/hugeicons/
 */
"use client";

import * as React from "react";
import { icons as hugeiconsCollection } from "@iconify-json/hugeicons";
import { getIconData, iconToSVG } from "@iconify/utils";
import { cn } from "@/lib/utils";

export type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number | string;
  absoluteStrokeWidth?: boolean;
};

export type LucideIcon = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>;

function createIcon(iconName: string, displayName?: string): LucideIcon {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(
    (
      {
        size = 24,
        className,
        style,
        color,
        strokeWidth: _strokeWidth,
        absoluteStrokeWidth: _absoluteStrokeWidth,
        ...props
      },
      ref
    ) => {
      const data = getIconData(hugeiconsCollection, iconName);
      if (!data) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[icons] Missing hugeicons:${iconName}`);
        }
        return (
          <svg
            ref={ref}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={cn("shrink-0", className)}
            aria-hidden
            {...props}
          />
        );
      }

      const rendered = iconToSVG(data, {
        height: typeof size === "number" ? `${size}px` : String(size),
      });

      return (
        <svg
          ref={ref}
          xmlns="http://www.w3.org/2000/svg"
          width={rendered.attributes.width}
          height={rendered.attributes.height}
          viewBox={rendered.attributes.viewBox}
          className={cn("shrink-0", className)}
          style={{
            ...style,
            color: color ?? style?.color,
          }}
          dangerouslySetInnerHTML={{ __html: rendered.body }}
          aria-hidden={props["aria-hidden"] ?? true}
          {...props}
        />
      );
    }
  );
  Icon.displayName = displayName || iconName;
  return Icon;
}

/** Lucide export name → Hugeicons icon id */
const MAP = {
  Activity: "activity-01",
  AlertCircle: "alert-circle",
  AlertCircleIcon: "alert-circle",
  AlertTriangle: "alert-02",
  ArchiveXIcon: "archive",
  ArrowDown: "arrow-down-01",
  ArrowDownLeft: "arrow-down-left-01",
  ArrowLeft: "arrow-left-01",
  ArrowRight: "arrow-right-01",
  ArrowRightIcon: "arrow-right-01",
  ArrowUp: "arrow-up-01",
  ArrowUpDown: "arrow-up-down",
  Award: "award-01",
  BanIcon: "cancel-circle",
  BarChart: "bar-chart",
  BarChart2: "chart-02",
  BarChart3: "chart-03",
  Bell: "notification-01",
  Bot: "bot",
  Brain: "brain-01",
  Briefcase: "briefcase-01",
  Building: "building-03",
  Building2: "building-06",
  Calendar: "calendar-03",
  CalendarDays: "calendar-04",
  Camera: "camera-01",
  Check: "tick-02",
  CheckCircle: "checkmark-circle-02",
  CheckCircle2: "checkmark-circle-02",
  CheckIcon: "tick-02",
  ChevronDown: "arrow-down-01",
  ChevronDownIcon: "arrow-down-01",
  ChevronLeft: "arrow-left-01",
  ChevronRight: "arrow-right-01",
  ChevronRightIcon: "arrow-right-01",
  ChevronUp: "arrow-up-01",
  ChevronUpIcon: "arrow-up-01",
  ChevronsUpDown: "arrow-up-down",
  Circle: "circle",
  CircleAlert: "alert-circle",
  CircleIcon: "circle",
  ClipboardCheck: "clipboard",
  ClipboardCopy: "clipboard-copy",
  ClipboardList: "clipboard",
  Clock: "clock-01",
  Code2: "code",
  Copy: "copy-01",
  Cpu: "cpu",
  CreditCard: "credit-card",
  Database: "database",
  Download: "download-01",
  Edit: "edit-02",
  Edit2: "pencil-edit-01",
  Eraser: "eraser-01",
  ExternalLink: "link-square-02",
  Eye: "view",
  EyeOff: "view-off-slash",
  FileDown: "file-download",
  FileText: "file-01",
  FileUp: "file-upload",
  Filter: "filter",
  Folder: "folder-01",
  FolderDown: "folder-download",
  FolderOpen: "folder-open",
  Footprints: "walking",
  GaugeCircle: "dashboard-circle",
  Globe: "globe-02",
  GripVertical: "drag-drop-vertical",
  HardHat: "baseball-helmet",
  HelpCircle: "help-circle",
  History: "clock-01",
  Home: "home-01",
  Image: "image-01",
  ImageIcon: "image-01",
  Info: "information-circle",
  Languages: "translate",
  Layers: "layers-01",
  LayersIcon: "layers-01",
  Layout: "layout-01",
  LayoutDashboard: "dashboard-square-01",
  Lightbulb: "idea-01",
  Link: "link-01",
  List: "left-to-right-list-bullet",
  Loader2: "loading-03",
  Loader2Icon: "loading-03",
  LoaderCircleIcon: "loading-02",
  Lock: "lock",
  LogIn: "login-01",
  LogOut: "logout-01",
  LucidePercentSquare: "percent-square",
  Mail: "mail-01",
  MapPin: "map-pin",
  MapPinIcon: "map-pin",
  Maximize2: "maximize-screen",
  MaximizeIcon: "maximize-01",
  Menu: "menu-01",
  MessageSquare: "message-01",
  MinimizeIcon: "minimize-screen",
  Minus: "minus-sign",
  MinusIcon: "minus-sign",
  Moon: "moon-02",
  MoreVertical: "more-vertical",
  MoveUpRight: "arrow-up-right-01",
  NavigationIcon: "navigation-01",
  PanelLeftClose: "panel-left-close",
  PanelLeftOpen: "panel-left-open",
  Paperclip: "attachment",
  PartyPopper: "party",
  PenLineIcon: "pencil-edit-02",
  Pencil: "pencil",
  PentagonIcon: "pentagon",
  Phone: "call-02",
  PhoneCallIcon: "call",
  PieChart: "pie-chart",
  PiggyBank: "piggy-bank",
  Play: "play",
  Plus: "add-01",
  PlusCircle: "add-circle",
  PlusIcon: "add-01",
  Redo2: "redo-02",
  RefreshCw: "refresh",
  Rocket: "rocket-01",
  RocketIcon: "rocket-01",
  RotateCcw: "rotate-01",
  RotateCw: "rotate-clockwise",
  Save: "save",
  Search: "search-01",
  SearchCode: "search-code",
  SearchIcon: "search-01",
  Send: "mail-send-01",
  SendHorizontal: "sent",
  Settings: "settings-01",
  Shield: "shield-01",
  ShieldAlert: "shield-energy",
  ShieldCheck: "security-check",
  Sparkles: "sparkles",
  SquareIcon: "square",
  SquareRoundCorner: "square",
  Star: "star",
  Sun: "sun-03",
  SwitchCamera: "switch-camera",
  Target: "target-01",
  Timer: "timer-01",
  Trash2: "delete-02",
  Trash2Icon: "delete-02",
  TrendingDown: "chart-down",
  TrendingUp: "chart-up",
  TrendingUpIcon: "chart-up",
  Type: "text",
  Undo2: "undo-02",
  Undo2Icon: "undo-02",
  Upload: "upload-01",
  UploadCloud: "cloud-upload",
  User: "user",
  UserCheck: "user-check-01",
  UserPlus: "user-add-01",
  Users: "user-multiple",
  Users2: "user-group",
  WaypointsIcon: "maps",
  X: "cancel-01",
  XCircle: "cancel-circle",
  XCircleIcon: "cancel-circle",
  XIcon: "cancel-01",
  Zap: "zap",
} as const;

type IconExportName = keyof typeof MAP;

const cache = new Map<string, LucideIcon>();

function getMappedIcon(name: IconExportName): LucideIcon {
  const existing = cache.get(name);
  if (existing) return existing;
  const icon = createIcon(MAP[name], name);
  cache.set(name, icon);
  return icon;
}

export const Activity = getMappedIcon("Activity");
export const AlertCircle = getMappedIcon("AlertCircle");
export const AlertCircleIcon = getMappedIcon("AlertCircleIcon");
export const AlertTriangle = getMappedIcon("AlertTriangle");
export const ArchiveXIcon = getMappedIcon("ArchiveXIcon");
export const ArrowDown = getMappedIcon("ArrowDown");
export const ArrowDownLeft = getMappedIcon("ArrowDownLeft");
export const ArrowLeft = getMappedIcon("ArrowLeft");
export const ArrowRight = getMappedIcon("ArrowRight");
export const ArrowRightIcon = getMappedIcon("ArrowRightIcon");
export const ArrowUp = getMappedIcon("ArrowUp");
export const ArrowUpDown = getMappedIcon("ArrowUpDown");
export const Award = getMappedIcon("Award");
export const BanIcon = getMappedIcon("BanIcon");
export const BarChart = getMappedIcon("BarChart");
export const BarChart2 = getMappedIcon("BarChart2");
export const BarChart3 = getMappedIcon("BarChart3");
export const Bell = getMappedIcon("Bell");
export const Bot = getMappedIcon("Bot");
export const Brain = getMappedIcon("Brain");
export const Briefcase = getMappedIcon("Briefcase");
export const Building = getMappedIcon("Building");
export const Building2 = getMappedIcon("Building2");
export const Calendar = getMappedIcon("Calendar");
export const CalendarDays = getMappedIcon("CalendarDays");
export const Camera = getMappedIcon("Camera");
export const Check = getMappedIcon("Check");
export const CheckCircle = getMappedIcon("CheckCircle");
export const CheckCircle2 = getMappedIcon("CheckCircle2");
export const CheckIcon = getMappedIcon("CheckIcon");
export const ChevronDown = getMappedIcon("ChevronDown");
export const ChevronDownIcon = getMappedIcon("ChevronDownIcon");
export const ChevronLeft = getMappedIcon("ChevronLeft");
export const ChevronRight = getMappedIcon("ChevronRight");
export const ChevronRightIcon = getMappedIcon("ChevronRightIcon");
export const ChevronUp = getMappedIcon("ChevronUp");
export const ChevronUpIcon = getMappedIcon("ChevronUpIcon");
export const ChevronsUpDown = getMappedIcon("ChevronsUpDown");
export const Circle = getMappedIcon("Circle");
export const CircleAlert = getMappedIcon("CircleAlert");
export const CircleIcon = getMappedIcon("CircleIcon");
export const ClipboardCheck = getMappedIcon("ClipboardCheck");
export const ClipboardCopy = getMappedIcon("ClipboardCopy");
export const ClipboardList = getMappedIcon("ClipboardList");
export const Clock = getMappedIcon("Clock");
export const Code2 = getMappedIcon("Code2");
export const Copy = getMappedIcon("Copy");
export const Cpu = getMappedIcon("Cpu");
export const CreditCard = getMappedIcon("CreditCard");
export const Database = getMappedIcon("Database");
export const Download = getMappedIcon("Download");
export const Edit = getMappedIcon("Edit");
export const Edit2 = getMappedIcon("Edit2");
export const Eraser = getMappedIcon("Eraser");
export const ExternalLink = getMappedIcon("ExternalLink");
export const Eye = getMappedIcon("Eye");
export const EyeOff = getMappedIcon("EyeOff");
export const FileDown = getMappedIcon("FileDown");
export const FileText = getMappedIcon("FileText");
export const FileUp = getMappedIcon("FileUp");
export const Filter = getMappedIcon("Filter");
export const Folder = getMappedIcon("Folder");
export const FolderDown = getMappedIcon("FolderDown");
export const FolderOpen = getMappedIcon("FolderOpen");
export const Footprints = getMappedIcon("Footprints");
export const GaugeCircle = getMappedIcon("GaugeCircle");
export const Globe = getMappedIcon("Globe");
export const GripVertical = getMappedIcon("GripVertical");
export const HardHat = getMappedIcon("HardHat");
export const HelpCircle = getMappedIcon("HelpCircle");
export const History = getMappedIcon("History");
export const Home = getMappedIcon("Home");
export const Image = getMappedIcon("Image");
export const ImageIcon = getMappedIcon("ImageIcon");
export const Info = getMappedIcon("Info");
export const Languages = getMappedIcon("Languages");
export const Layers = getMappedIcon("Layers");
export const LayersIcon = getMappedIcon("LayersIcon");
export const Layout = getMappedIcon("Layout");
export const LayoutDashboard = getMappedIcon("LayoutDashboard");
export const Lightbulb = getMappedIcon("Lightbulb");
export const Link = getMappedIcon("Link");
export const List = getMappedIcon("List");
export const Loader2 = getMappedIcon("Loader2");
export const Loader2Icon = getMappedIcon("Loader2Icon");
export const LoaderCircleIcon = getMappedIcon("LoaderCircleIcon");
export const Lock = getMappedIcon("Lock");
export const LogIn = getMappedIcon("LogIn");
export const LogOut = getMappedIcon("LogOut");
export const LucidePercentSquare = getMappedIcon("LucidePercentSquare");
export const Mail = getMappedIcon("Mail");
export const MapPin = getMappedIcon("MapPin");
export const MapPinIcon = getMappedIcon("MapPinIcon");
export const Maximize2 = getMappedIcon("Maximize2");
export const MaximizeIcon = getMappedIcon("MaximizeIcon");
export const Menu = getMappedIcon("Menu");
export const MessageSquare = getMappedIcon("MessageSquare");
export const MinimizeIcon = getMappedIcon("MinimizeIcon");
export const Minus = getMappedIcon("Minus");
export const MinusIcon = getMappedIcon("MinusIcon");
export const Moon = getMappedIcon("Moon");
export const MoreVertical = getMappedIcon("MoreVertical");
export const MoveUpRight = getMappedIcon("MoveUpRight");
export const NavigationIcon = getMappedIcon("NavigationIcon");
export const PanelLeftClose = getMappedIcon("PanelLeftClose");
export const PanelLeftOpen = getMappedIcon("PanelLeftOpen");
export const Paperclip = getMappedIcon("Paperclip");
export const PartyPopper = getMappedIcon("PartyPopper");
export const PenLineIcon = getMappedIcon("PenLineIcon");
export const Pencil = getMappedIcon("Pencil");
export const PentagonIcon = getMappedIcon("PentagonIcon");
export const Phone = getMappedIcon("Phone");
export const PhoneCallIcon = getMappedIcon("PhoneCallIcon");
export const PieChart = getMappedIcon("PieChart");
export const PiggyBank = getMappedIcon("PiggyBank");
export const Play = getMappedIcon("Play");
export const Plus = getMappedIcon("Plus");
export const PlusCircle = getMappedIcon("PlusCircle");
export const PlusIcon = getMappedIcon("PlusIcon");
export const Redo2 = getMappedIcon("Redo2");
export const RefreshCw = getMappedIcon("RefreshCw");
export const Rocket = getMappedIcon("Rocket");
export const RocketIcon = getMappedIcon("RocketIcon");
export const RotateCcw = getMappedIcon("RotateCcw");
export const RotateCw = getMappedIcon("RotateCw");
export const Save = getMappedIcon("Save");
export const Search = getMappedIcon("Search");
export const SearchCode = getMappedIcon("SearchCode");
export const SearchIcon = getMappedIcon("SearchIcon");
export const Send = getMappedIcon("Send");
export const SendHorizontal = getMappedIcon("SendHorizontal");
export const Settings = getMappedIcon("Settings");
export const Shield = getMappedIcon("Shield");
export const ShieldAlert = getMappedIcon("ShieldAlert");
export const ShieldCheck = getMappedIcon("ShieldCheck");
export const Sparkles = getMappedIcon("Sparkles");
export const SquareIcon = getMappedIcon("SquareIcon");
export const SquareRoundCorner = getMappedIcon("SquareRoundCorner");
export const Star = getMappedIcon("Star");
export const Sun = getMappedIcon("Sun");
export const SwitchCamera = getMappedIcon("SwitchCamera");
export const Target = getMappedIcon("Target");
export const Timer = getMappedIcon("Timer");
export const Trash2 = getMappedIcon("Trash2");
export const Trash2Icon = getMappedIcon("Trash2Icon");
export const TrendingDown = getMappedIcon("TrendingDown");
export const TrendingUp = getMappedIcon("TrendingUp");
export const TrendingUpIcon = getMappedIcon("TrendingUpIcon");
export const Type = getMappedIcon("Type");
export const Undo2 = getMappedIcon("Undo2");
export const Undo2Icon = getMappedIcon("Undo2Icon");
export const Upload = getMappedIcon("Upload");
export const UploadCloud = getMappedIcon("UploadCloud");
export const User = getMappedIcon("User");
export const UserCheck = getMappedIcon("UserCheck");
export const UserPlus = getMappedIcon("UserPlus");
export const Users = getMappedIcon("Users");
export const Users2 = getMappedIcon("Users2");
export const WaypointsIcon = getMappedIcon("WaypointsIcon");
export const X = getMappedIcon("X");
export const XCircle = getMappedIcon("XCircle");
export const XCircleIcon = getMappedIcon("XCircleIcon");
export const XIcon = getMappedIcon("XIcon");
export const Zap = getMappedIcon("Zap");

/** Generic Hugeicons SVG by Iconify id, e.g. `home-01`. */
export function HugeIcon({
  name,
  ...props
}: IconProps & { name: string }) {
  const Icon = React.useMemo(() => createIcon(name), [name]);
  return <Icon {...props} />;
}
