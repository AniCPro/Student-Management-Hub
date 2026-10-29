import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  useCreateStudent, useDeleteStudent, useGetDashboardSummary,
  useGetStaffAccess, useGetStudent, useListStudents, useUpdateStudent,
  getGetDashboardSummaryQueryKey, getGetStudentQueryKey, getListStudentsQueryKey,
  getGetStaffAccessQueryKey,
} from '@workspace/api-client-react';
import type { Student, StudentInput, StudentUpdate, StudentStatus } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
import { ArrowDownUp, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronRight, GraduationCap, LayoutDashboard, LoaderCircle, LockKeyhole, Plus, Search, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const statusOptions: StudentStatus[] = ['Active', 'Inactive', 'Graduated'];
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#244b3e',
    colorForeground: '#263b34',
    colorMutedForeground: '#6b7d74',
    colorDanger: '#a74f43',
    colorBackground: '#fffdf7',
    colorInput: '#fffdf7',
    colorInputForeground: '#263b34',
    colorNeutral: '#d9ded5',
    fontFamily: 'DM Sans',
    borderRadius: '0.65rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffdf7] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl shadow-[#19382d]/10',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#263b34] font-semibold tracking-tight',
    headerSubtitle: 'text-[#687970]',
    socialButtonsBlockButtonText: 'text-[#263b34] font-medium',
    formFieldLabel: 'text-[#36483f] font-medium',
    footerActionLink: 'text-[#244b3e] font-semibold',
    footerActionText: 'text-[#687970]',
    dividerText: 'text-[#758178]',
    identityPreviewEditButton: 'text-[#244b3e]',
    formFieldSuccessText: 'text-[#326b50]',
    alertText: 'text-[#7b4039]',
    logoBox: 'max-h-12',
    logoImage: 'max-h-12',
    socialButtonsBlockButton: 'border-[#d9ded5] bg-[#fffdf7] hover:bg-[#f2f2e9]',
    formButtonPrimary: 'bg-[#244b3e] hover:bg-[#19382d] text-white font-semibold',
    formFieldInput: 'border-[#d9ded5] bg-[#fffdf7] text-[#263b34]',
    footerAction: 'border-t border-[#e7e8df]',
    dividerLine: 'bg-[#e1e3da]',
    alert: 'bg-[#fcf0ec] border-[#ebd0c8]',
    otpCodeFieldInput: 'border-[#d9ded5] bg-[#fffdf7] text-[#263b34]',
    formFieldRow: 'gap-1.5',
    main: 'gap-5',
  },
};

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const title = location === '/dashboard' ? 'Overview' : location.startsWith('/students/') ? 'Student record' : 'Student directory';
  const userMark = `${user?.firstName?.[0] ?? 'S'}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  return <div className="min-h-[100dvh] bg-background text-foreground md:flex">
    <aside className="flex w-full flex-col bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:w-[246px]">
      <Link href="/" className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5" data-testid="link-home">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><BookOpen size={21}/></span>
        <span><span className="block font-serif text-[17px] font-extrabold tracking-tight">Student Registry</span><span className="mt-0.5 block text-[10px] uppercase tracking-[.19em] text-sidebar-foreground/55">Student records</span></span>
      </Link>
      <div className="px-4 pt-6">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-sidebar-foreground/45">Workspace</p>
        <nav className="space-y-1">
          <Link href="/dashboard" data-testid="link-nav-overview" className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${location === '/dashboard' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'}`}>
            <LayoutDashboard size={17} strokeWidth={1.8}/> Overview {location === '/dashboard' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent"/>}
          </Link>
          <Link href="/students" data-testid="link-nav-students" className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${location.startsWith('/students') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'}`}>
            <Users size={17} strokeWidth={1.8}/> Students {location.startsWith('/students') && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent"/>}
          </Link>
        </nav>
      </div>
      <div className="mt-auto hidden px-5 pb-5 md:block">
        <div className="rounded-xl border border-sidebar-border bg-white/[.035] p-4">
          <div className="mb-3 flex items-center gap-2 text-sidebar-primary"><GraduationCap size={17}/><span className="text-[11px] font-semibold uppercase tracking-[.12em]">Registrar desk</span></div>
          <p className="text-xs leading-relaxed text-sidebar-foreground/60">Keep every student record clear, current, and ready when it matters.</p>
          <div className="mt-4 flex items-center gap-2 border-t border-sidebar-border pt-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-primary/20 text-[10px] font-bold text-sidebar-primary">RD</span><span className="text-xs font-medium">Records team</span><span className="ml-auto h-2 w-2 rounded-full bg-emerald-400"/></div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-sidebar-border px-5 py-3 text-[10px] text-sidebar-foreground/45 md:hidden">
        <span>Registrar workspace</span><span>STUDENT • DESK</span>
      </div>
    </aside>
    <div className="min-w-0 flex-1 md:ml-[246px]">
      <header className="sticky top-0 z-20 flex h-[62px] items-center justify-between border-b border-border/80 bg-background/95 px-5 backdrop-blur md:px-9">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="hidden sm:inline">Registrar</span><ChevronRight size={14} className="hidden sm:block"/><span className="font-semibold text-foreground">{title}</span></div>
         <div className="flex items-center gap-3"><span className="hidden text-xs text-muted-foreground sm:inline">Records are up to date</span><span className="h-2 w-2 rounded-full bg-emerald-600"/><span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-[11px] font-bold text-primary">{userMark}</span><button type="button" onClick={() => signOut({ redirectUrl: basePath || '/' })} className="text-xs font-semibold text-muted-foreground hover:text-foreground" data-testid="button-sign-out">Sign out</button></div>
      </header>
      <main className="page-enter mx-auto max-w-[1440px] px-4 py-6 md:px-9 md:py-8">{children}</main>
    </div>
  </div>;
}

function PageHeading({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-primary/65">{eyebrow}</p><h1 className="font-serif text-[28px] font-extrabold leading-tight tracking-[-.035em] text-foreground md:text-[34px]">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>
    {children}
  </div>;
}

function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3" aria-label="Loading records" data-testid="loading-state">{Array.from({ length: rows }, (_, i) => <div key={i} className="flex items-center gap-4 rounded-xl border border-border/60 bg-card px-5 py-4"><Skeleton className="h-9 w-9 rounded-full skeleton-shimmer"/><div className="flex-1 space-y-2"><Skeleton className="h-3 w-1/3 skeleton-shimmer"/><Skeleton className="h-2.5 w-1/2 skeleton-shimmer"/></div><Skeleton className="h-5 w-16 skeleton-shimmer"/></div>)}</div>;
}

function ErrorState({ onRetry, text = 'We could not load this information right now.' }: { onRetry: () => void; text?: string }) {
  return <div className="rounded-xl border border-dashed border-destructive/35 bg-destructive/[.035] px-6 py-10 text-center" data-testid="status-error">
    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"><X size={18}/></div><p className="text-sm font-semibold">Something needs another try</p><p className="mt-1 text-xs text-muted-foreground">{text}</p><Button variant="outline" size="sm" className="mt-4" onClick={onRetry} data-testid="button-retry">Try again</Button>
  </div>;
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border bg-card/70 px-6 py-12 text-center" data-testid="status-empty"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary"><Users size={19}/></div><p className="text-sm font-semibold">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{text}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

function initials(student: Pick<Student, 'firstName' | 'lastName'>) {
  return `${student.firstName?.[0] ?? ''}${student.lastName?.[0] ?? ''}`.toUpperCase();
}
const avatarTints = ['bg-[#e6eee8] text-[#32614e]', 'bg-[#f2e8d1] text-[#805f21]', 'bg-[#e7e9f1] text-[#485373]', 'bg-[#f1e3df] text-[#92564d]'];
function AvatarMark({ student, index = 0 }: { student: Pick<Student, 'firstName' | 'lastName'>; index?: number }) {
  return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarTints[index % avatarTints.length]}`} aria-hidden="true">{initials(student)}</span>;
}

function StatusBadge({ status }: { status: StudentStatus }) {
  const styles = status === 'Active' ? 'border-emerald-700/15 bg-emerald-700/[.08] text-emerald-800' : status === 'Graduated' ? 'border-primary/15 bg-primary/[.08] text-primary' : 'border-amber-700/15 bg-amber-700/[.08] text-amber-800';
  return <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${styles}`} data-testid={`status-student-${status.toLowerCase()}`}><span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status === 'Active' ? 'bg-emerald-700' : status === 'Graduated' ? 'bg-primary' : 'bg-amber-700'}`}/>{status}</Badge>;
}

function dateLabel(date: string) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}
function StudentLink({ student, index = 0 }: { student: Student; index?: number }) {
  return <Link href={`/students/${student.id}`} className="group flex min-w-0 items-center gap-3" data-testid={`link-student-${student.id}`}><AvatarMark student={student} index={index}/><span className="min-w-0"><span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">{student.firstName} {student.lastName}</span><span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{student.studentId}</span></span></Link>;
}

function StudentFormDialog({ open, onOpenChange, student }: { open: boolean; onOpenChange: (open: boolean) => void; student?: Student }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const creating = !student;
  const createMutation = useCreateStudent();
  const updateMutation = useUpdateStudent();
  const form = useForm<StudentInput>({
    defaultValues: {
      firstName: student?.firstName ?? '', lastName: student?.lastName ?? '', email: student?.email ?? '',
      phone: student?.phone ?? '', program: student?.program ?? '', year: student?.year ?? 1,
      enrollmentDate: student?.enrollmentDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      status: student?.status ?? 'Active',
    },
  });
  const saving = createMutation.isPending || updateMutation.isPending;
  const invalidate = async (id?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }),
      ...(id ? [queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(id) })] : []),
    ]);
  };
  const submit = (values: StudentInput) => {
    const payload: StudentInput = { ...values, phone: values.phone?.trim() || null, year: Number(values.year) };
    if (student) {
      const update: StudentUpdate = payload;
      updateMutation.mutate({ id: student.id, data: update }, {
        onSuccess: async () => { await invalidate(student.id); toast({ title: 'Student record updated' }); onOpenChange(false); },
        onError: () => toast({ title: 'Could not update record', description: 'Please try again in a moment.', variant: 'destructive' }),
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: async () => { await invalidate(); toast({ title: 'Student added to the directory' }); onOpenChange(false); form.reset(); },
        onError: () => toast({ title: 'Could not create record', description: 'Check the details and try again.', variant: 'destructive' }),
      });
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[610px]">
      <DialogHeader><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary/65">{creating ? 'New student record' : `Editing ${student?.studentId}`}</p><DialogTitle className="font-serif text-2xl font-extrabold">{creating ? 'Add a student' : 'Update student details'}</DialogTitle><DialogDescription>Enter the official details as they should appear in the student register.</DialogDescription></DialogHeader>
      <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="mt-2 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {(['firstName', 'lastName', 'email', 'phone', 'program'] as const).map((name) => <FormField key={name} control={form.control} name={name} rules={{ required: name !== 'phone' ? 'This field is required' : false, ...(name === 'email' ? { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } } : {}) }} render={({ field }) => <FormItem className={name === 'email' || name === 'program' ? 'sm:col-span-2' : ''}><FormLabel>{name === 'firstName' ? 'First name' : name === 'lastName' ? 'Last name' : name === 'email' ? 'Email address' : name === 'phone' ? 'Phone (optional)' : 'Program'}</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder={name === 'email' ? 'student@desk.edu' : name === 'phone' ? '+91 (555) 000-000' : name === 'program' ? 'e.g. Environmental Studies' : ''} data-testid={`input-${name}`}/></FormControl><FormMessage/></FormItem>}/>)}
          <FormField control={form.control} name="year" rules={{ required: 'Choose a year', min: { value: 1, message: 'Year must be 1–8' }, max: { value: 8, message: 'Year must be 1–8' } }} render={({ field }) => <FormItem><FormLabel>Year of study</FormLabel><Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}><FormControl><SelectTrigger data-testid="select-year"><SelectValue placeholder="Select year"/></SelectTrigger></FormControl><SelectContent>{Array.from({ length: 8 }, (_, index) => <SelectItem key={index} value={String(index + 1)}>Year {index + 1}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>}/>
          <FormField control={form.control} name="enrollmentDate" rules={{ required: 'Enrollment date is required' }} render={({ field }) => <FormItem><FormLabel>Enrollment date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-enrollment-date"/></FormControl><FormMessage/></FormItem>}/>
          <FormField control={form.control} name="status" render={({ field }) => <FormItem className="sm:col-span-2"><FormLabel>Enrollment status</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger data-testid="select-status"><SelectValue/></SelectTrigger></FormControl><SelectContent>{statusOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></FormItem>}/>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-cancel-student">Cancel</Button><Button type="submit" disabled={saving} data-testid="button-save-student">{saving && <LoaderCircle size={15} className="mr-2 animate-spin"/>}{creating ? 'Add student' : 'Save changes'}</Button></div>
      </form></Form>
    </DialogContent>
  </Dialog>;
}

function DeleteStudentDialog({ student, open, onOpenChange, onDeleted }: { student: Student | null; open: boolean; onOpenChange: (open: boolean) => void; onDeleted?: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mutation = useDeleteStudent();
  const handleDelete = () => {
    if (!student) return;
    mutation.mutate({ id: student.id }, {
      onSuccess: async () => {
        await Promise.all([queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }), queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }), queryClient.removeQueries({ queryKey: getGetStudentQueryKey(student.id) })]);
        toast({ title: 'Student record deleted' }); onOpenChange(false); onDeleted?.();
      },
      onError: () => toast({ title: 'Could not delete record', description: 'Please try again.', variant: 'destructive' }),
    });
  };
  return <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent>
    <AlertDialogHeader><AlertDialogTitle className="font-serif text-xl">Delete this student record?</AlertDialogTitle><AlertDialogDescription>This will permanently remove <strong>{student?.firstName} {student?.lastName}</strong> ({student?.studentId}) from the directory. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
    <AlertDialogFooter><AlertDialogCancel data-testid="button-cancel-delete">Keep record</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); handleDelete(); }} disabled={mutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">{mutation.isPending ? 'Deleting…' : 'Delete record'}</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>;
}

function MetricCard({ label, value, note, tone, icon }: { label: string; value: number; note: string; tone: string; icon: ReactNode }) {
  return <Card className="overflow-hidden border-card-border bg-card shadow-sm shadow-primary/[.025]"><CardContent className="relative p-5 md:p-5"><div className={`absolute right-0 top-0 h-20 w-20 rounded-bl-[70px] opacity-[.08] ${tone}`}/><div className="flex items-start justify-between"><span className="text-[11px] font-semibold uppercase tracking-[.11em] text-muted-foreground">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone} text-white`}>{icon}</span></div><div className="mt-4 flex items-baseline gap-2"><span className="font-serif text-[34px] font-extrabold tracking-[-.045em]" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value.toLocaleString()}</span></div><p className="mt-1 text-[11px] text-muted-foreground">{note}</p></CardContent></Card>;
}

function Dashboard() {
  const { data, isLoading, isError, refetch } = useGetDashboardSummary();
  const [formOpen, setFormOpen] = useState(false);
  return <div>
    <PageHeading eyebrow="Registrar workspace" title="Student overview" text="A clear view of your student records and enrollment health.">
      <Button onClick={() => setFormOpen(true)} className="h-10 shadow-sm" data-testid="button-add-student"><Plus size={16} className="mr-2"/>Add student</Button>
    </PageHeading>
    {isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[135px] rounded-xl skeleton-shimmer"/>)}<div className="xl:col-span-4"><LoadingBlock rows={3}/></div></div> : isError || !data ? <ErrorState onRetry={() => refetch()}/> : <>
      <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total students" value={data.totalStudents} note="All records in the register" tone="bg-primary" icon={<Users size={16}/>}/>
        <MetricCard label="Active" value={data.activeStudents} note={data.totalStudents ? `${((data.activeStudents / data.totalStudents) * 100).toFixed(1)}% of enrolled students` : 'No active enrollment yet'} tone="bg-[#4d806b]" icon={<Check size={16}/>}/>
        <MetricCard label="Inactive" value={data.inactiveStudents} note="Records needing attention" tone="bg-[#bd9143]" icon={<SlidersHorizontal size={16}/>}/>
        <MetricCard label="Graduated" value={data.graduatedStudents} note="Completed their program" tone="bg-[#77829d]" icon={<GraduationCap size={16}/>}/>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(310px,.85fr)]">
        <Card className="border-card-border bg-card shadow-sm shadow-primary/[.025]">
          <div className="flex items-center justify-between border-b border-border/80 px-5 py-4"><div><h2 className="font-serif text-[17px] font-bold">Recently added</h2><p className="mt-0.5 text-xs text-muted-foreground">The latest records entered into the register</p></div><Link href="/students" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline" data-testid="link-view-directory">View directory <ArrowRight size={14}/></Link></div>
          {data.recentStudents.length ? <div className="divide-y divide-border/70">{data.recentStudents.slice(0, 6).map((student, index) => <div key={student.id} className="grid grid-cols-[minmax(0,1.35fr)_minmax(130px,1fr)_auto] items-center gap-3 px-5 py-3.5"><StudentLink student={student} index={index}/><span className="hidden truncate text-xs text-muted-foreground sm:block">{student.program}</span><StatusBadge status={student.status}/></div>)}</div> : <div className="p-5"><EmptyState title="No students added yet" text="Your newest student records will appear here as they are added." action={<Button size="sm" onClick={() => setFormOpen(true)} data-testid="button-empty-add"><Plus size={14} className="mr-1"/>Add first student</Button>}/></div>}
        </Card>
        <Card className="border-card-border bg-card shadow-sm shadow-primary/[.025]">
          <div className="border-b border-border/80 px-5 py-4"><h2 className="font-serif text-[17px] font-bold">Enrollment by program</h2><p className="mt-0.5 text-xs text-muted-foreground">Student distribution across programs</p></div>
          {data.byProgram.length ? <div className="space-y-5 px-5 py-5">{data.byProgram.slice(0, 7).map((item, index) => {
            const max = Math.max(...data.byProgram.map((entry) => entry.count), 1);
            const colors = ['bg-primary', 'bg-[#c69a50]', 'bg-[#59816e]', 'bg-[#77829d]', 'bg-[#b86d5e]', 'bg-[#5392a0]', 'bg-[#9a835f]'];
            return <div key={item.program} data-testid={`program-row-${index}`}><div className="mb-2 flex items-center justify-between gap-3"><span className="truncate text-xs font-medium">{item.program}</span><span className="font-mono text-[11px] text-muted-foreground">{item.count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full ${colors[index % colors.length]} transition-[width] duration-500`} style={{ width: `${Math.max((item.count / max) * 100, 3)}%` }}/></div></div>;
          })}</div> : <div className="p-5"><EmptyState title="No program data yet" text="Program distribution will appear once student records are added."/></div>}
          <div className="mx-5 mb-5 rounded-lg bg-secondary/65 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Enrollment health</p><div className="mt-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-700"/><span className="text-xs font-semibold">{data.totalStudents ? `${((data.activeStudents / data.totalStudents) * 100).toFixed(1)}% active` : 'No enrollment data'}</span><span className="ml-auto text-[10px] text-muted-foreground">Active student share</span></div></div>
        </Card>
      </div>
    </>}
    <StudentFormDialog open={formOpen} onOpenChange={setFormOpen}/>
  </div>;
}

function StudentDirectory() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [program, setProgram] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const params = useMemo(() => ({ ...(search.trim() ? { q: search.trim() } : {}), ...(status !== 'all' ? { status: status as StudentStatus } : {}), ...(program !== 'all' ? { program } : {}) }), [search, status, program]);
  const { data: students, isLoading, isError, refetch } = useListStudents(params);
  const programs = useMemo(() => [...new Set((students ?? []).map((student) => student.program))].sort((a, b) => a.localeCompare(b)), [students]);
  const clearFilters = () => { setSearch(''); setStatus('all'); setProgram('all'); };
  return <div>
    <PageHeading eyebrow="Student records" title="Student directory" text="Search, review, and maintain the official student register.">
      <Button onClick={() => setFormOpen(true)} className="h-10" data-testid="button-add-student"><Plus size={16} className="mr-2"/>Add student</Button>
    </PageHeading>
    <Card className="mb-5 border-card-border bg-card shadow-sm shadow-primary/[.025]">
      <div className="grid gap-3 p-4 md:grid-cols-[minmax(220px,1fr)_190px_220px_auto] md:items-center">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 pl-9" placeholder="Search name, ID, or email" aria-label="Search students" data-testid="input-search-students"/></div>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="h-10" data-testid="select-filter-status"><SelectValue placeholder="All statuses"/></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statusOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
        <Select value={program} onValueChange={setProgram}><SelectTrigger className="h-10" data-testid="select-filter-program"><SelectValue placeholder="All programs"/></SelectTrigger><SelectContent><SelectItem value="all">All programs</SelectItem>{programs.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
        <Button variant="ghost" className="h-10 text-muted-foreground" onClick={clearFilters} data-testid="button-clear-filters"><X size={14} className="mr-1.5"/>Clear</Button>
      </div>
    </Card>
    <Card className="overflow-hidden border-card-border bg-card shadow-sm shadow-primary/[.025]">
      <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5"><div><span className="text-sm font-semibold">All students</span><span className="ml-2 rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground" data-testid="text-student-count">{students?.length ?? 0}</span></div><span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><ArrowDownUp size={12}/> Recently updated</span></div>
      {isLoading ? <div className="p-4"><LoadingBlock rows={5}/></div> : isError ? <div className="p-5"><ErrorState onRetry={() => refetch()} text="The student directory is temporarily unavailable."/></div> : students?.length ? <div className="overflow-x-auto">
        <table className="w-full min-w-[770px] text-left">
          <thead><tr className="bg-secondary/45 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground"><th className="px-5 py-3">Student</th><th className="px-4 py-3">Program / year</th><th className="px-4 py-3">Enrollment date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-border/70">{students.map((student, index) => <DirectoryRow key={student.id} student={student} index={index} onDelete={setDeleteStudent}/>)}</tbody>
        </table>
      </div> : <div className="p-5"><EmptyState title={search || status !== 'all' || program !== 'all' ? 'No matching students' : 'Your directory is ready'} text={search || status !== 'all' || program !== 'all' ? 'Try adjusting the search terms or filters to find a student.' : 'Add the first student record to begin keeping your register up to date.'} action={search || status !== 'all' || program !== 'all' ? <Button variant="outline" size="sm" onClick={clearFilters} data-testid="button-empty-clear">Clear filters</Button> : <Button size="sm" onClick={() => setFormOpen(true)} data-testid="button-empty-add"><Plus size={14} className="mr-1"/>Add student</Button>}/></div>}
      {students?.length ? <div className="flex items-center justify-between border-t border-border/80 px-5 py-3"><span className="text-[11px] text-muted-foreground">Showing <strong className="text-foreground">{students.length}</strong> student{students.length === 1 ? '' : 's'}</span><span className="text-[10px] text-muted-foreground">Directory records</span></div> : null}
    </Card>
    <StudentFormDialog open={formOpen} onOpenChange={setFormOpen}/>
    <DeleteStudentDialog student={deleteStudent} open={!!deleteStudent} onOpenChange={(open) => !open && setDeleteStudent(null)}/>
  </div>;
}

function DirectoryRow({ student, index, onDelete }: { student: Student; index: number; onDelete: (student: Student) => void }) {
  const [editOpen, setEditOpen] = useState(false);
  return <>
    <tr className="group hover:bg-secondary/25" data-testid={`row-student-${student.id}`}>
      <td className="px-5 py-3.5"><StudentLink student={student} index={index}/><span className="mt-1.5 block pl-12 text-[11px] text-muted-foreground">{student.email}</span></td>
      <td className="px-4 py-3.5"><span className="block max-w-[230px] truncate text-xs font-medium">{student.program}</span><span className="mt-1 block text-[10px] text-muted-foreground">Year {student.year}</span></td>
      <td className="px-4 py-3.5 text-xs text-muted-foreground">{dateLabel(student.enrollmentDate)}</td>
      <td className="px-4 py-3.5"><StatusBadge status={student.status}/></td>
      <td className="px-4 py-3.5"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs" onClick={() => setEditOpen(true)} data-testid={`button-edit-${student.id}`}>Edit</Button><Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs text-destructive hover:text-destructive" onClick={() => onDelete(student)} data-testid={`button-delete-${student.id}`}>Delete</Button><Link href={`/students/${student.id}`} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary" aria-label={`View ${student.firstName} ${student.lastName}`} data-testid={`link-view-${student.id}`}><ChevronRight size={16}/></Link></div></td>
    </tr>
    <StudentFormDialog open={editOpen} onOpenChange={setEditOpen} student={student}/>
  </>;
}

function StudentDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data: student, isLoading, isError, refetch } = useGetStudent(id, { query: { queryKey: getGetStudentQueryKey(id) } });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [, setLocation] = useLocation();
  if (isLoading) return <div><div className="mb-6"><Skeleton className="mb-4 h-4 w-32 skeleton-shimmer"/><Skeleton className="h-9 w-72 skeleton-shimmer"/></div><LoadingBlock rows={4}/></div>;
  if (isError || !student) return <ErrorState onRetry={() => refetch()} text="We could not find this student record."/>;
  return <div>
    <Link href="/students" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary" data-testid="link-back-directory"><ArrowLeft size={15}/> Back to directory</Link>
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4"><AvatarMark student={student} index={1}/><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary/65">Student record · <span className="font-mono">{student.studentId}</span></p><h1 className="mt-1 font-serif text-[28px] font-extrabold tracking-[-.035em]">{student.firstName} {student.lastName}</h1><p className="mt-1 text-xs text-muted-foreground">{student.program} <span className="mx-1.5">/</span> Year {student.year}</p></div></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => setEditOpen(true)} data-testid="button-edit-student"><span className="mr-2">Edit record</span></Button><Button variant="outline" className="border-destructive/25 text-destructive hover:bg-destructive/5 hover:text-destructive" onClick={() => setDeleteOpen(true)} data-testid="button-delete-student">Delete</Button></div>
    </div>
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm shadow-primary/[.025]"><StatusBadge status={student.status}/><span className="h-4 border-l border-border"/><span className="text-xs text-muted-foreground">Enrolled {dateLabel(student.enrollmentDate)}</span><span className="ml-auto text-[10px] text-muted-foreground">Record added {dateLabel(student.createdAt)}</span></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]">
      <Card className="border-card-border bg-card shadow-sm shadow-primary/[.025]"><div className="border-b border-border/80 px-5 py-4"><h2 className="font-serif text-base font-bold">Personal details</h2><p className="mt-1 text-xs text-muted-foreground">Contact information associated with this record</p></div><div className="grid gap-x-8 gap-y-6 p-5 sm:grid-cols-2"><DetailField label="First name" value={student.firstName}/><DetailField label="Last name" value={student.lastName}/><DetailField label="Email address" value={student.email}/><DetailField label="Phone number" value={student.phone || 'Not provided'}/></div></Card>
      <Card className="border-card-border bg-card shadow-sm shadow-primary/[.025]"><div className="border-b border-border/80 px-5 py-4"><h2 className="font-serif text-base font-bold">Enrollment details</h2><p className="mt-1 text-xs text-muted-foreground">Academic placement and record history</p></div><div className="space-y-5 p-5"><DetailField label="Student ID" value={student.studentId} mono/><DetailField label="Program" value={student.program}/><div className="grid grid-cols-2 gap-5"><DetailField label="Year of study" value={`Year ${student.year}`}/><DetailField label="Status" value={<StatusBadge status={student.status}/>}/></div><DetailField label="Enrollment date" value={dateLabel(student.enrollmentDate)}/></div></Card>
    </div>
    <StudentFormDialog open={editOpen} onOpenChange={setEditOpen} student={student}/>
    <DeleteStudentDialog student={student} open={deleteOpen} onOpenChange={setDeleteOpen} onDeleted={() => setLocation('/students')}/>
  </div>;
}

function DetailField({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return <div><p className="mb-1.5 text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">{label}</p><div className={`text-sm font-medium ${mono ? 'font-mono text-[12px]' : ''}`} data-testid={`field-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</div></div>;
}

function LandingPage() {
  return <div className="min-h-[100dvh] overflow-hidden bg-[#f6f4eb] text-[#263b34]">
    <header className="relative z-10 mx-auto flex max-w-[1280px] items-center justify-between px-5 py-5 md:px-10 md:py-7">
      <Link href="/" className="flex items-center gap-3" aria-label="Student Desk home">
        <img src={`${basePath}/logo.svg`} className="h-10 w-10" alt="" />
        <span><span className="block font-serif text-[17px] font-extrabold tracking-tight">Student Desk</span><span className="block text-[9px] font-semibold uppercase tracking-[.2em] text-[#65776d]">Student records</span></span>
      </Link>
      <nav className="flex items-center gap-3">
        <Link href="/sign-in" className="hidden rounded-lg px-4 py-2.5 text-sm font-semibold text-[#435b50] hover:bg-[#e9e9de] sm:inline-flex">Staff sign in</Link>
        <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-lg bg-[#244b3e] px-4 py-2.5 text-sm font-semibold text-[#fffdf7] shadow-sm hover:bg-[#19382d]">Create account <ArrowUpRight size={15}/></Link>
      </nav>
    </header>
    <main>
      <section className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-5 pb-20 pt-9 md:grid-cols-[1.03fr_.97fr] md:px-10 md:pb-28 md:pt-14">
        <div className="relative z-10 max-w-[610px] page-enter">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d8ded3] bg-[#fbfaf4] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#4c6658]"><span className="h-1.5 w-1.5 rounded-full bg-[#6b9876]"/> A dedicated workspace for school registrars</div>
          <h1 className="max-w-[650px] font-serif text-[48px] font-extrabold leading-[.98] tracking-[-.065em] sm:text-[62px] lg:text-[76px]">Every student,<br/><span className="text-[#78906f]">accounted for.</span></h1>
          <p className="mt-7 max-w-[470px] text-base leading-7 text-[#65776d] md:text-[17px]">A steady, thoughtful place to maintain student records. Keep the details current, the register clear, and your day moving.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/sign-in" className="group inline-flex h-12 items-center gap-3 rounded-lg bg-[#244b3e] px-5 text-sm font-semibold text-[#fffdf7] shadow-[0_8px_20px_-10px_rgba(36,75,62,.55)] transition-transform hover:-translate-y-0.5 hover:bg-[#19382d]">Enter staff workspace <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5"/></Link>
            <span className="inline-flex items-center gap-2 px-2 text-xs font-medium text-[#77867e]"><LockKeyhole size={14}/> Staff access only</span>
          </div>
          <div className="mt-12 flex items-center gap-4 border-t border-[#dedfd5] pt-5">
            <div className="flex -space-x-2"><span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f6f4eb] bg-[#dce7dc] text-[10px] font-bold text-[#41634f]">R</span><span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f6f4eb] bg-[#eadfc8] text-[10px] font-bold text-[#7c6236]">A</span><span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f6f4eb] bg-[#dce1eb] text-[10px] font-bold text-[#50617b]">M</span></div>
            <p className="text-xs leading-5 text-[#65776d]"><strong className="text-[#344b3f]">Made for the registrar’s desk.</strong><br/>Clear records, considered access.</p>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[610px] md:ml-auto">
          <div className="absolute -right-12 -top-14 h-64 w-64 rounded-full bg-[#e5e8d6] blur-3xl"/>
          <div className="absolute -bottom-8 -left-12 h-48 w-48 rounded-full bg-[#e9dfc8] blur-3xl"/>
          <div className="relative rounded-[28px] border border-[#d9ded3] bg-[#fdfcf6] p-3 shadow-[0_30px_80px_-36px_rgba(39,62,49,.34)]">
            <div className="overflow-hidden rounded-[20px] border border-[#e4e5db] bg-[#fffefa]">
              <div className="flex items-center justify-between border-b border-[#e7e8df] px-5 py-4"><div className="flex items-center gap-2"><img src={`${basePath}/logo.svg`} className="h-7 w-7" alt=""/><span className="text-[11px] font-bold tracking-tight text-[#355246]">DESK / REGISTRY</span></div><span className="rounded-full bg-[#eff3e9] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-[#54725e]">Registrar view</span></div>
              <div className="p-5 sm:p-7">
                <div className="flex items-end justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#839085]">Workspace / overview</p><h2 className="mt-2 font-serif text-2xl font-extrabold tracking-[-.04em] text-[#2b4438]">Good morning.</h2></div><span className="mb-1 text-[10px] text-[#88948a]">Today, 9:41 AM</span></div>
                <div className="mt-6 grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl bg-[#f2f4eb] p-3"><span className="block text-[9px] font-semibold uppercase tracking-[.08em] text-[#718175]">Enrolled</span><strong className="mt-2 block font-serif text-2xl text-[#304b3e]">1,284</strong><span className="mt-1 block text-[9px] text-[#88948a]">In the register</span></div>
                  <div className="rounded-xl bg-[#f5f0e3] p-3"><span className="block text-[9px] font-semibold uppercase tracking-[.08em] text-[#857656]">Active</span><strong className="mt-2 block font-serif text-2xl text-[#675b3f]">1,106</strong><span className="mt-1 block text-[9px] text-[#9b8e71]">Current enrollment</span></div>
                  <div className="rounded-xl bg-[#eef1f1] p-3"><span className="block text-[9px] font-semibold uppercase tracking-[.08em] text-[#748285]">Programs</span><strong className="mt-2 block font-serif text-2xl text-[#465c61]">18</strong><span className="mt-1 block text-[9px] text-[#8b999a]">Across the school</span></div>
                </div>
                <div className="mt-6 rounded-xl border border-[#e6e7df]">
                  <div className="flex items-center justify-between border-b border-[#e8e9e1] px-4 py-3"><span className="text-[11px] font-bold text-[#3d5347]">Recently updated</span><span className="text-[9px] font-semibold text-[#718175]">View all records</span></div>
                  {[['AS','Advik Sharma','Environmental Studies','Active','bg-[#dce9df] text-[#496d53]'],['NK','Noor Khan','Public Health','Active','bg-[#eae3d3] text-[#796542]'],['JR','Jatin Rathore','Applied Mathematics','Graduated','bg-[#e0e4eb] text-[#59667d]']].map(([mark, name, program, state, tint]) => <div key={name} className="flex items-center gap-3 border-b border-[#eeeee7] px-4 py-3 last:border-0"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-bold ${tint}`}>{mark}</span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-bold text-[#344b3f]">{name}</span><span className="mt-0.5 block truncate text-[9px] text-[#89948a]">{program}</span></span><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${state === 'Active' ? 'bg-[#eff4ea] text-[#54745a]' : 'bg-[#edf0f5] text-[#66728a]'}`}>{state}</span></div>)}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 right-5 flex items-center gap-3 rounded-xl border border-[#e2e4d9] bg-[#fffefa] px-4 py-3 shadow-lg shadow-[#263b34]/10"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e9f0e6] text-[#4f7256]"><ShieldCheck size={16}/></span><span><strong className="block text-[10px] text-[#40594a]">Private by design</strong><small className="mt-0.5 block text-[9px] text-[#859087]">Access for approved staff</small></span></div>
        </div>
      </section>
      <section className="border-y border-[#e2e2d8] bg-[#eeefe5]">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-10 md:grid-cols-[.8fr_1.2fr] md:items-center md:px-10">
          <p className="max-w-[260px] text-[11px] font-bold uppercase leading-5 tracking-[.15em] text-[#78867b]">The record is the foundation. Make every detail count.</p>
          <div className="grid gap-6 sm:grid-cols-3">{[['01','One dependable register'],['02','Clear student histories'],['03','A calmer daily workflow']].map(([num, label]) => <div key={num} className="flex items-center gap-3"><span className="font-mono text-[10px] text-[#9a8a60]">{num}</span><span className="text-sm font-semibold text-[#3d5548]">{label}</span></div>)}</div>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1280px] gap-12 px-5 py-16 md:grid-cols-2 md:gap-20 md:px-10 md:py-24">
        <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8d805e]">A better registrar routine</p><h2 className="mt-4 max-w-[480px] font-serif text-[35px] font-extrabold leading-[1.04] tracking-[-.05em] text-[#2b4438] md:text-[46px]">Less searching.<br/>More certainty.</h2><p className="mt-5 max-w-[430px] text-sm leading-7 text-[#6e7c72]">Student Desk gives school staff a shared, structured view of the people behind every student record—without making daily work feel complicated.</p></div>
        <div className="space-y-3">
          <div className="flex gap-4 rounded-2xl border border-[#e0e2d8] bg-[#fbfaf4] p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8eee4] text-[#496d53]"><Search size={17}/></span><div><h3 className="text-sm font-bold text-[#3d5347]">Find the right record quickly</h3><p className="mt-1 text-xs leading-5 text-[#77847a]">Search the directory by name, student ID, or email. Narrow the view by program and enrollment status.</p></div></div>
          <div className="flex gap-4 rounded-2xl border border-[#e0e2d8] bg-[#fbfaf4] p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1ecdc] text-[#826e42]"><BookOpen size={17}/></span><div><h3 className="text-sm font-bold text-[#3d5347]">Keep every detail in context</h3><p className="mt-1 text-xs leading-5 text-[#77847a]">Review enrollment, program placement, contact details, and the record’s current status together.</p></div></div>
          <div className="flex gap-4 rounded-2xl border border-[#e0e2d8] bg-[#fbfaf4] p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7eaee] text-[#586a7b]"><ShieldCheck size={17}/></span><div><h3 className="text-sm font-bold text-[#3d5347]">For approved school staff</h3><p className="mt-1 text-xs leading-5 text-[#77847a]">Sign-in is only the first step. The registrar workspace is reserved for accounts approved by your school.</p></div></div>
        </div>
      </section>
      <section className="mx-5 mb-16 overflow-hidden rounded-[24px] bg-[#284b3e] md:mx-auto md:mb-20 md:max-w-[1200px]">
        <div className="relative flex flex-col gap-8 px-6 py-9 text-[#f8f6ed] md:flex-row md:items-center md:justify-between md:px-12 md:py-12"><div className="absolute -right-12 -top-24 h-64 w-64 rounded-full border border-[#8fa48d]/20"/><div className="relative"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#c7d0bb]">Your registrar workspace</p><h2 className="mt-3 max-w-[580px] font-serif text-3xl font-extrabold tracking-[-.045em] md:text-[40px]">Start with a clear register.</h2><p className="mt-3 text-sm text-[#d0d8ca]">Sign in with your approved staff account to continue.</p></div><Link href="/sign-in" className="relative inline-flex h-12 shrink-0 items-center justify-center gap-3 rounded-lg bg-[#e5d8b6] px-5 text-sm font-bold text-[#2d4739] hover:bg-[#f1e7ce]">Staff sign in <ArrowRight size={16}/></Link></div>
      </section>
    </main>
    <footer className="border-t border-[#e1e2d8] px-5 py-6 md:px-10"><div className="mx-auto flex max-w-[1280px] flex-col gap-2 text-[10px] text-[#839086] sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} Student Desk · Registrar workspace</span><span className="inline-flex items-center gap-1.5"><LockKeyhole size={11}/> Private student records. Staff access only.</span></div></footer>
  </div>;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="min-h-[100dvh] bg-[#f6f4eb] p-8"><div className="mx-auto h-8 max-w-5xl animate-pulse rounded bg-[#e5e7dc]"/></div>;
  return isSignedIn ? <Redirect to="/dashboard"/> : <LandingPage/>;
}

function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  return <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f4f2e9] px-4 py-10">
    <div className="pointer-events-none absolute -left-32 top-[-6rem] h-[28rem] w-[28rem] rounded-full bg-[#e7eadc] blur-3xl"/>
    <div className="pointer-events-none absolute -right-36 bottom-[-8rem] h-[28rem] w-[28rem] rounded-full bg-[#e9e0cc] blur-3xl"/>
    <Link href="/" className="absolute left-5 top-5 z-10 flex items-center gap-2.5 md:left-10 md:top-8"><img src={`${basePath}/logo.svg`} className="h-9 w-9" alt=""/><span className="font-serif text-sm font-extrabold text-[#304b3e]">Student Desk</span></Link>
    <div className="relative z-10 grid w-full max-w-[990px] items-center gap-10 md:grid-cols-[.8fr_1fr] md:gap-14">
      <div className="hidden md:block"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8d805e]">Registrar workspace</p><h1 className="mt-4 font-serif text-[42px] font-extrabold leading-[1.04] tracking-[-.05em] text-[#2b4438]">{mode === 'sign-in' ? 'Good to have you back.' : 'Your staff account starts here.'}</h1><p className="mt-4 max-w-[330px] text-sm leading-6 text-[#718077]">{mode === 'sign-in' ? 'Sign in to continue to the student register and your daily records.' : 'Create an account with your school email. Workspace access is approved separately.'}</p><div className="mt-8 flex items-center gap-3 border-t border-[#dfe1d7] pt-5 text-xs text-[#68786e]"><ShieldCheck size={17} className="text-[#5e8065]"/> Student data is only available to approved staff.</div></div>
      <div className="w-full">{mode === 'sign-in' ? <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}/> : <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`}/>}</div>
    </div>
  </div>;
}

function StaffAccessGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const access = useGetStaffAccess({ query: { enabled: isLoaded && !!isSignedIn, queryKey: getGetStaffAccessQueryKey(), retry: 1 } });
  if (!isLoaded) return <div className="grid min-h-[100dvh] place-items-center bg-background"><div className="w-64 space-y-3"><div className="h-3 animate-pulse rounded bg-secondary"/><div className="h-3 w-2/3 animate-pulse rounded bg-secondary"/></div></div>;
  if (!isSignedIn) return <Redirect to="/sign-in"/>;
  if (access.isLoading) return <div className="grid min-h-[100dvh] place-items-center bg-background"><div className="w-72 space-y-4 rounded-xl border border-border bg-card p-6"><div className="h-8 w-8 animate-pulse rounded-lg bg-secondary"/><div className="h-3 animate-pulse rounded bg-secondary"/><div className="h-3 w-3/4 animate-pulse rounded bg-secondary"/></div></div>;
  if (access.isError) return <main className="grid min-h-[100dvh] place-items-center bg-[#f6f4eb] px-5"><section className="max-w-md rounded-2xl border border-[#dedfd5] bg-[#fffefa] p-8 text-center shadow-sm"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#f3eadb] text-[#7c6740]"><ShieldCheck size={22}/></span><h1 className="mt-5 font-serif text-2xl font-extrabold text-[#304b3e]">Access could not be confirmed</h1><p className="mt-2 text-sm leading-6 text-[#718077]">We could not verify your staff access just now. Your student records remain protected. Please try again.</p><Button className="mt-5" onClick={() => access.refetch()} disabled={access.isFetching}>Try again</Button></section></main>;
  if (!access.data?.allowed) return <main className="grid min-h-[100dvh] place-items-center bg-[#f6f4eb] px-5"><section className="max-w-md rounded-2xl border border-[#dedfd5] bg-[#fffefa] p-8 text-center shadow-sm"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#f3eadb] text-[#7c6740]"><LockKeyhole size={21}/></span><p className="mt-5 text-[10px] font-bold uppercase tracking-[.2em] text-[#8d805e]">Student Desk · staff access</p><h1 className="mt-2 font-serif text-2xl font-extrabold text-[#304b3e]">This workspace is restricted</h1><p className="mt-2 text-sm leading-6 text-[#718077]">Your account is signed in, but it is not approved for the registrar workspace. Contact your school administrator if you believe you should have access.</p><div className="mt-6 flex justify-center gap-3"><Link href="/" className="inline-flex h-10 items-center rounded-lg border border-[#d9ded3] px-4 text-sm font-semibold text-[#52675a] hover:bg-[#f3f3eb]">Return home</Link><SignOutButton/></div></section></main>;
  return <>{children}</>;
}

function SignOutButton() {
  const { signOut } = useClerk();
  return <Button variant="outline" onClick={() => signOut({ redirectUrl: basePath || '/' })}>Sign out</Button>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) queryClient.clear();
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

function AppRoutes() {
  return <Switch>
    <Route path="/" component={HomeRedirect}/>
    <Route path="/sign-in/*?" component={() => <AuthPage mode="sign-in"/>}/>
    <Route path="/sign-up/*?" component={() => <AuthPage mode="sign-up"/>}/>
    <Route path="/dashboard"><StaffAccessGate><RoutedErrorBoundary><Shell><Dashboard/></Shell></RoutedErrorBoundary></StaffAccessGate></Route>
    <Route path="/students"><StaffAccessGate><RoutedErrorBoundary><Shell><StudentDirectory/></Shell></RoutedErrorBoundary></StaffAccessGate></Route>
    <Route path="/students/:id">{(params) => <StaffAccessGate><RoutedErrorBoundary><Shell><StudentDetail params={params}/></Shell></RoutedErrorBoundary></StaffAccessGate>}</Route>
    <Route component={NotFound}/>
  </Switch>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    routerPush={(to) => setLocation(stripBase(to))}
    routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    localization={{
      signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to your Student Registry workspace' } },
      signUp: { start: { title: 'Create your staff account', subtitle: 'Use your school email to register' } },
    }}
  >
    <QueryClientProvider client={queryClient}>
      <ClerkQueryClientCacheInvalidator/>
      <TooltipProvider><AppRoutes/><Toaster/></TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes/></WouterRouter>;
}

export default App;
