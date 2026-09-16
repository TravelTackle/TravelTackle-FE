import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Navbar, { Avatar } from '../components/Navbar'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import FloatingCart from '../components/FloatingCart'
import Section from '../components/ui/Section'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import OptionCard from '../components/onboarding/OptionCard'
import ProfilePhotoRow from '../components/mypage/ProfilePhotoRow'
import { useAuth } from '../context/AuthContext'
import { useLanguage, LANGUAGES } from '../i18n'
import { getPreferences, createPreferences, updatePreferences } from '../api/preferences'
import { updateProfile, changePassword, updateNotificationSettings, deleteAccount } from '../api/auth'
import { getMyTrips } from '../api/trip'
import { getReceivedFeedback } from '../api/feed'
import { getPreferenceOptions } from '../data/preferenceOptions'

// 이 파일 전체(프로필/계정 설정)에서 쓰는 문구 — Footer.jsx와 동일한 ko/en 맵 패턴.
const T = {
  ko: {
    tabProfile: '프로필 설정',
    tabPreference: '선호도 수정',
    providerEmail: '이메일',
    providerKakao: '카카오',
    stepInterestTitle: '이번 여행에서 가장 끌리는 것은 무엇인가요?',
    stepStyleTitle: '여행할 때 어떤 스타일에 가까우신가요?',
    stepBudgetTitle: '여행에서 소비하는 편은 어느 쪽인가요?',
    stepBudgetSubtitle: '숙박비/항공권 제외',
    stepRegionTitle: '가고 싶은 지역이 있으신가요?',
    notifFeedback: '피드백 알림',
    notifRecommend: '여행 추천',
    notifEvent: '이벤트',
    cancel: '취소',
    back: '이전',
    changeButton: '변경',
    doneButton: '완료',
    nextButton: '다음',
    editButton: '수정하기',
    genericSaving: '저장 중…',
    notSet: '설정 안 함',
    multiSelectHint: '중복 선택 가능',
    labelProfilePhoto: '프로필 사진',
    labelNickname: '닉네임',
    labelEmail: '이메일',
    labelPassword: '비밀번호',
    labelLoginInfo: '로그인 정보',
    labelLanguage: '언어',
    labelNotifSettings: '알림 설정',
    labelAccount: '계정',
    nicknameErrorEmpty: '닉네임을 입력해주세요.',
    nicknameErrorGeneric: '닉네임을 변경하지 못했어요.',
    toastNicknameChanged: '닉네임을 변경했어요',
    languageSaveError: '언어 저장에 실패했어요',
    toastNotifSaved: '알림 설정을 저장했어요',
    notifSaveErrorGeneric: '알림 설정을 저장하지 못했어요',
    notifEmailAllow: '이메일 알림 허용',
    emailNotifOffTitle: '이메일 알림을 끄시겠어요?',
    emailNotifOffDesc: '피드백 알림, 여행 추천, 이벤트 알림을 받을 수 없어요.',
    notifOffConfirmLabel: '끄기',
    notifOffTitle: (label) => `${label}을 끄시겠어요?`,
    notifOffDesc: (label) => `${label}을 받지 못해요.`,
    pwdErrorAllRequired: '모든 항목을 입력해주세요.',
    pwdErrorMinLength: '새 비밀번호는 8자 이상이어야 해요.',
    pwdErrorMismatch: '새 비밀번호가 일치하지 않아요.',
    pwdErrorGeneric: '비밀번호를 변경하지 못했어요. 잠시 후 다시 시도해주세요.',
    pwdPlaceholderCurrent: '현재 비밀번호',
    pwdPlaceholderNew: '새 비밀번호 (8자 이상)',
    pwdPlaceholderConfirm: '새 비밀번호 확인',
    pwdSaveButton: '변경하기',
    pwdConfirmTitle: '비밀번호를 변경하시겠어요?',
    pwdConfirmDescription: '변경 후에는 새 비밀번호로 다시 로그인해야 할 수 있어요.',
    pwdConfirmSaving: '변경 중…',
    toastPasswordChanged: '비밀번호를 변경했어요',
    deleteConfirmPhrase: '다음 여행에서 만나요',
    deleteSummaryHeading: (count) => `트레블 참견과 함께 ${count}개의 여행을 만들어왔어요`,
    deleteSummaryDesc: '탈퇴하면 아래 계획과 참견이 모두 사라져요. 정말 떠나시겠어요?',
    deleteSummaryTripsTitle: '내가 만든 여행 계획',
    deleteSummaryFeedbackTitle: '받은 참견',
    moreCount: (n) => `그 외 ${n}개 더…`,
    feedbackCountSuffix: (n) => `${n}개`,
    deleteSummaryProceed: '그래도 탈퇴할게요',
    deleteConfirmTitle: '정말 탈퇴하시겠어요?',
    deleteConfirmDesc: '탈퇴하면 내 여행 계획, 기록, 참견 내역이 모두 삭제되고 복구할 수 없어요.',
    deleteConfirmBefore: '계속하려면 아래에 ',
    deleteConfirmAfter: '를 입력해주세요.',
    deleteErrorGeneric: '탈퇴 처리에 실패했어요. 잠시 후 다시 시도해주세요.',
    deleteProcessing: '탈퇴 처리 중…',
    deleteAccountButton: '회원 탈퇴',
    preferenceSaveError: '선호도를 저장하지 못했어요. 잠시 후 다시 시도해주세요.',
    summaryInterest: '관심사',
    summaryStyle: '여행 스타일',
    summaryBudget: '예산',
    summaryRegion: '선호 지역',
    backAria: '뒤로가기',
  },
  en: {
    tabProfile: 'Profile Settings',
    tabPreference: 'Edit Preferences',
    providerEmail: 'Email',
    providerKakao: 'Kakao',
    stepInterestTitle: 'What excites you most about this trip?',
    stepStyleTitle: 'Which travel style fits you best?',
    stepBudgetTitle: 'How do you tend to spend on trips?',
    stepBudgetSubtitle: 'Excluding lodging/flights',
    stepRegionTitle: "Any regions you'd like to visit?",
    notifFeedback: 'Feedback alerts',
    notifRecommend: 'Trip recommendations',
    notifEvent: 'Events',
    cancel: 'Cancel',
    back: 'Back',
    changeButton: 'Change',
    doneButton: 'Done',
    nextButton: 'Next',
    editButton: 'Edit',
    genericSaving: 'Saving…',
    notSet: 'Not set',
    multiSelectHint: 'Multiple selections allowed',
    labelProfilePhoto: 'Profile photo',
    labelNickname: 'Nickname',
    labelEmail: 'Email',
    labelPassword: 'Password',
    labelLoginInfo: 'Login info',
    labelLanguage: 'Language',
    labelNotifSettings: 'Notifications',
    labelAccount: 'Account',
    nicknameErrorEmpty: 'Please enter a nickname.',
    nicknameErrorGeneric: "Couldn't update your nickname.",
    toastNicknameChanged: 'Nickname updated',
    languageSaveError: 'Failed to save language',
    toastNotifSaved: 'Notification settings saved',
    notifSaveErrorGeneric: 'Failed to save notification settings',
    notifEmailAllow: 'Allow email notifications',
    emailNotifOffTitle: 'Turn off email notifications?',
    emailNotifOffDesc: "You won't receive feedback, recommendation, or event alerts.",
    notifOffConfirmLabel: 'Turn off',
    notifOffTitle: (label) => `Turn off ${label}?`,
    notifOffDesc: (label) => `You won't receive ${label}.`,
    pwdErrorAllRequired: 'Please fill in all fields.',
    pwdErrorMinLength: 'New password must be at least 8 characters.',
    pwdErrorMismatch: 'New passwords do not match.',
    pwdErrorGeneric: "Couldn't change your password. Please try again later.",
    pwdPlaceholderCurrent: 'Current password',
    pwdPlaceholderNew: 'New password (min. 8 characters)',
    pwdPlaceholderConfirm: 'Confirm new password',
    pwdSaveButton: 'Change',
    pwdConfirmTitle: 'Change your password?',
    pwdConfirmDescription: 'You may need to log in again with your new password.',
    pwdConfirmSaving: 'Changing…',
    toastPasswordChanged: 'Password changed',
    deleteConfirmPhrase: 'See you on the next trip',
    deleteSummaryHeading: (count) => `You've created ${count} trips with Travel Tackle`,
    deleteSummaryDesc: 'Deleting your account removes all the plans and feedback below. Are you sure you want to leave?',
    deleteSummaryTripsTitle: 'Trip plans you created',
    deleteSummaryFeedbackTitle: 'Feedback received',
    moreCount: (n) => `${n} more…`,
    feedbackCountSuffix: (n) => `${n}`,
    deleteSummaryProceed: 'Delete my account anyway',
    deleteConfirmTitle: 'Are you sure you want to delete your account?',
    deleteConfirmDesc: 'Deleting your account permanently removes all your trip plans, records, and feedback. This cannot be undone.',
    deleteConfirmBefore: 'Type ',
    deleteConfirmAfter: ' below to continue.',
    deleteErrorGeneric: "Couldn't delete your account. Please try again later.",
    deleteProcessing: 'Deleting…',
    deleteAccountButton: 'Delete account',
    preferenceSaveError: "Couldn't save your preferences. Please try again later.",
    summaryInterest: 'Interests',
    summaryStyle: 'Travel style',
    summaryBudget: 'Budget',
    summaryRegion: 'Preferred regions',
    backAria: 'Go back',
  },
}

// 닉네임/언어/로그인정보/비밀번호/선호도는 실 API 연동 완료.
function getSettingsTabs(copy) {
  return [
    { value: 'profile', label: copy.tabProfile },
    { value: 'preference', label: copy.tabPreference },
  ]
}

// LoginPage.jsx와 동일한 아이콘·순서·브랜드 색 (이메일 폼 -> 카카오 -> Google -> Apple)
// authProvider: 백엔드 AuthProvider enum 값(CurrentUserResponse.authProviders)과 매핑 — 이메일/비번 로그인은 LOCAL로 내려온다
function getLoginProviders(copy) {
  return [
    { key: 'email', authProvider: 'LOCAL', label: copy.providerEmail, icon: 'mdi:email-outline', style: { background: '#1e293b', color: '#fff' } },
    { key: 'kakao', authProvider: 'KAKAO', label: copy.providerKakao, icon: 'ri:kakao-talk-fill', style: { background: '#FEE500', color: '#191600' } },
    { key: 'google', authProvider: 'GOOGLE', label: 'Google', icon: 'logos:google-icon', style: { background: '#fff', color: '#334155', border: '1px solid #e2e8f0' } },
    { key: 'apple', authProvider: 'APPLE', label: 'Apple', icon: 'ri:apple-fill', style: { background: '#000', color: '#fff' } },
  ]
}

// 온보딩 PreferenceWizard와 동일한 스텝 구성 — 수정 흐름도 완전히 같은 화면으로 보여준다.
// options는 getPreferenceOptions(language) 결과 — value는 언어와 무관, label/description만 바뀐다.
function getSteps(copy, options) {
  return [
    {
      key: 'interestTags',
      multiple: true,
      title: copy.stepInterestTitle,
      options: options.INTEREST_TAGS,
      // 2열이면 모바일 폭에서 라벨 텍스트(nowrap)가 카드 밖으로 넘쳐 잘려 보여서 1열로
      grid: 'grid-cols-1 sm:grid-cols-3',
    },
    {
      key: 'travelStyle',
      multiple: false,
      title: copy.stepStyleTitle,
      options: options.TRAVEL_STYLES,
      grid: 'grid-cols-1',
    },
    {
      key: 'budgetLevel',
      multiple: false,
      title: copy.stepBudgetTitle,
      subtitle: copy.stepBudgetSubtitle,
      options: options.BUDGET_LEVELS,
      grid: 'grid-cols-1 sm:grid-cols-2',
    },
    {
      key: 'preferredRegions',
      multiple: true,
      title: copy.stepRegionTitle,
      options: options.PREFERRED_REGIONS,
      grid: 'grid-cols-2 sm:grid-cols-3',
    },
  ]
}

function emptyAnswers() {
  return { interestTags: new Set(), travelStyle: null, budgetLevel: null, preferredRegions: new Set() }
}

function answersFromPreferences(p) {
  return {
    interestTags: new Set(p?.interestTags || []),
    travelStyle: p?.travelStyle || null,
    budgetLevel: p?.budgetLevel || null,
    preferredRegions: new Set(p?.preferredRegions || []),
  }
}

function optionLabel(options, value) {
  return options.find((o) => o.value === value)?.label || value
}

function optionIcon(options, value) {
  return options.find((o) => o.value === value)?.icon
}

// 라벨 : 값 한 줄, 좌측 정렬 — 장식 없이 구분선만으로 행을 나눈다
// 라벨:값이 원래 한 줄인데, 모바일에서는 라벨 폭(w-24)에 값까지 욱여넣으면 값 쪽이 너무 좁아져서
// 세로로 쌓는다 — sm 이상에서는 기존처럼 한 줄.
function SettingRow({ label, icon, children }) {
  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 py-10 first:border-t-0 first:pt-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
      <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-slate-700 sm:w-24 sm:shrink-0">
        {icon && <Icon icon={icon} width={15} className="shrink-0 text-brand" />}
        {label}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

// TravelerFeedPage 정렬 드롭다운과 동일한 텍스트형 트리거 — 기본 select 대신.
// onPersist가 있으면 로컬(useLanguage, 챗봇 등에 즉시 반영)과 별개로 계정에도 저장한다.
function LanguageDropdown({ onPersist }) {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = LANGUAGES.find((l) => l.code === language)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[13px] font-semibold text-slate-700 hover:text-brand"
      >
        {current?.label}
        <Icon icon="solar:alt-arrow-down-linear" width={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="nav-pop absolute left-0 top-full z-30 mt-1.5 max-h-64 w-36 overflow-y-auto rounded-xl border border-slate-100 bg-surface py-1 shadow-popup">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLanguage(l.code)
                setOpen(false)
                onPersist?.(l.code)
              }}
              className={`block w-full px-3 py-1.5 text-left text-[12.5px] transition-colors ${
                language === l.code ? 'bg-brand-light font-bold text-brand' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// 기본 브라우저 체크박스 대신 쓰는 커스텀 체크 인디케이터 — 장식 없이 체크 표시만
function NotifToggle({ label, checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      aria-pressed={checked}
      disabled={disabled}
      className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${disabled ? 'text-slate-300' : 'text-slate-600'}`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          checked && !disabled ? 'border-brand bg-brand' : 'border-slate-200 bg-surface'
        }`}
      >
        {checked && !disabled && <Icon icon="solar:check-bold" width={9} color="white" />}
      </span>
      {label}
    </button>
  )
}

// RecordUploadModal의 확인 다이얼로그(오버레이 + 흰 카드 + 문구/버튼2개)와 동일한 패턴
function ConfirmDialog({ title, description, confirmLabel, confirmDisabled, onCancel, onConfirm }) {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[320px] rounded-2xl bg-surface p-5 shadow-popup">
        <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{description}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-slate-200 py-2 text-[12.5px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="flex-1 rounded-full bg-rose-500 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmLabel ?? copy.notifOffConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// 팝업 대신 행 바로 아래에서 펼쳐지는 패널 — ExploreSidebar의 테마/지역 접기와 동일한
// CSS Grid 0fr↔1fr 트릭으로 애니메이션. 현재 비밀번호로 본인 확인하므로 별도 이메일 인증은 없음
// (백엔드 PATCH /api/auth/password가 currentPassword 일치만 확인 — 이메일 재설정 흐름과는 다름).
function PasswordInlinePanel({ open, onSaved }) {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  function handleSave() {
    if (!current || !next || !confirm) {
      setError(copy.pwdErrorAllRequired)
      return
    }
    if (next.length < 8) {
      setError(copy.pwdErrorMinLength)
      return
    }
    if (next !== confirm) {
      setError(copy.pwdErrorMismatch)
      return
    }
    setError('')
    setConfirming(true)
  }

  async function handleConfirmed() {
    setSaving(true)
    try {
      await changePassword({ currentPassword: current, newPassword: next })
      setConfirming(false)
      setCurrent('')
      setNext('')
      setConfirm('')
      onSaved()
    } catch (err) {
      setConfirming(false)
      setError(err.response?.data?.message || copy.pwdErrorGeneric)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="overflow-hidden">
        {/* 라벨 폭만큼 자리를 비워 SettingRow의 값 칸과 좌측을 맞춘다 */}
        <div className="flex gap-6 mb-2">
          <span className="w-24 shrink-0" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-slate-100 bg-surface p-4">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder={copy.pwdPlaceholderCurrent}
            className="h-10 rounded-lg border border-slate-200 bg-surface px-3 text-[13px] outline-none focus:border-brand"
          />
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder={copy.pwdPlaceholderNew}
            className="h-10 rounded-lg border border-slate-200 bg-surface px-3 text-[13px] outline-none focus:border-brand"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={copy.pwdPlaceholderConfirm}
            className="h-10 rounded-lg border border-slate-200 bg-surface px-3 text-[13px] outline-none focus:border-brand"
          />
          {error && <p className="text-[12px] text-rose-500">{error}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-brand px-5 py-2 text-[12.5px] font-bold text-white hover:bg-brand-dark"
            >
              {copy.pwdSaveButton}
            </button>
          </div>
          </div>
        </div>
        {confirming && (
          <ConfirmDialog
            title={copy.pwdConfirmTitle}
            description={copy.pwdConfirmDescription}
            confirmLabel={saving ? copy.pwdConfirmSaving : copy.pwdSaveButton}
            confirmDisabled={saving}
            onCancel={() => setConfirming(false)}
            onConfirm={handleConfirmed}
          />
        )}
      </div>
    </div>
  )
}

// logo-icon.svg의 두 캐릭터(teal 왼쪽, blue 오른쪽)를 각각 그룹으로 분리 —
// 각자 반대편 화면 밖에서 날아와 원래 위치(=서로 마주 보는 자리)에 도착하는 연출.
// 착지 후엔 안쪽 <g>의 .animate-float로 계속 둥실거린다(날아오는 이동과 축이 겹치지 않게 중첩).
function MascotFlyIn() {
  return (
    <svg viewBox="0 0 1024 1024" className="h-20 w-20 drop-shadow-[0_16px_24px_rgba(31,102,227,0.25)]" aria-hidden="true">
      <g className="animate-fly-in-left">
        <g className="animate-float" style={{ animationDelay: '1.7s' }}>
          <path
            d="M292.611 215.874C294.375 215.19 294.292 215.186 296.458 214.595C368.68 195.562 445.625 209.088 511.135 252.331C498.185 261.958 482.605 269.692 471.345 282.2C460.443 293.658 468.006 313.947 468.625 329.72C474.921 490.423 234.921 501.895 250.157 663.954C254.858 688.914 266.076 703.94 279.69 723.612C246.723 723.577 216.182 720.948 187.431 701.793C36.9026 601.549 73.3363 356.391 201.023 263.588C235.569 238.483 253.836 228.392 292.611 215.874Z"
            fill="#0AAFA4"
          />
          <path
            d="M390.285 326.977C400.93 324.156 411.875 330.387 414.893 340.987C417.91 351.588 411.883 362.65 401.341 365.861C394.347 367.992 386.748 366.18 381.471 361.123C376.194 356.065 374.051 348.552 375.875 341.472C377.713 334.39 383.208 328.851 390.285 326.977Z"
            fill="#F5F5F5"
          />
        </g>
      </g>
      <g className="animate-fly-in-right">
        <g className="animate-float" style={{ animationDelay: '1.9s' }}>
          <path
            d="M584.573 340.221C583.733 337.861 584.773 335.173 587.043 333.996C616.227 318.867 647.982 309.276 680.526 305.779C799.022 293.06 897.296 360.566 913.031 476.01C914.909 489.644 915.759 503.416 916.745 517.167L915.3 520.778C909.79 610.208 863.327 678.474 781.43 720.68C779.801 721.52 778.698 723.162 778.557 724.977C776.781 747.812 772.939 766.515 767.253 788.317C766.487 791.257 763.341 792.92 760.597 791.781C737.269 782.099 703.421 763.623 681.453 752.322C680.615 751.891 679.739 751.718 678.786 751.806C609.867 758.207 407.238 716.508 363.724 668.74C313.043 613.097 489.325 532.292 528.636 507.832C593.07 518.029 592.736 507.096 581.48 450.983C581.057 448.877 581.333 446.622 582.234 444.63C600.926 403.289 598.838 380.325 584.573 340.221Z"
            fill="#1F66E3"
          />
          <path
            d="M711.365 419.294C722.01 416.473 732.955 422.705 735.973 433.305C738.99 443.905 732.963 454.967 722.421 458.179C715.427 460.309 707.828 458.497 702.551 453.441C697.274 448.383 695.131 440.869 696.955 433.79C698.793 426.708 704.288 421.168 711.365 419.294Z"
            fill="#F5F5F5"
          />
        </g>
      </g>
    </svg>
  )
}

const DELETE_SUMMARY_MAX = 4

function DeleteSummaryStep({ onCancel, onNext }) {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const [data, setData] = useState(null) // { trips, feedback } | null(로딩중)

  useEffect(() => {
    Promise.all([getMyTrips().catch(() => []), getReceivedFeedback().catch(() => [])]).then(([trips, feedback]) =>
      setData({ trips, feedback }),
    )
  }, [])

  const trips = data?.trips || []
  const feedback = data?.feedback || []

  return (
    <div className="w-full max-w-[560px] rounded-3xl bg-surface p-8 shadow-popup">
      <div className="flex justify-center">
        <MascotFlyIn />
      </div>
      <h3 className="mt-3 text-center text-[16px] font-bold text-slate-900">
        {copy.deleteSummaryHeading(trips.length)}
      </h3>
      <p className="mt-1.5 text-center text-[12.5px] leading-relaxed text-slate-500">
        {copy.deleteSummaryDesc}
      </p>

      {!data ? (
        <div className="mt-5 flex flex-col gap-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {trips.length > 0 && (
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-slate-500">
                <Icon icon="solar:notebook-bold" width={15} className="text-brand" />
                {copy.deleteSummaryTripsTitle}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {trips.slice(0, DELETE_SUMMARY_MAX).map((t) => (
                  <li key={t.id} className="truncate text-[15px] font-semibold text-slate-800">
                    · {t.title}
                  </li>
                ))}
                {trips.length > DELETE_SUMMARY_MAX && (
                  <li className="text-[12px] text-slate-400">{copy.moreCount(trips.length - DELETE_SUMMARY_MAX)}</li>
                )}
              </ul>
            </div>
          )}

          {feedback.length > 0 && (
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-slate-500">
                <Icon icon="solar:chat-round-dots-bold" width={15} className="text-brand" />
                {copy.deleteSummaryFeedbackTitle}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {feedback.slice(0, DELETE_SUMMARY_MAX).map((f) => (
                  <li key={f.tripId} className="flex items-center justify-between gap-2 text-[12.5px] text-slate-700">
                    <span className="truncate">· {f.tripTitle}</span>
                    <span className="shrink-0 text-slate-400">{copy.feedbackCountSuffix(f.totalFeedbackCount)}</span>
                  </li>
                ))}
                {feedback.length > DELETE_SUMMARY_MAX && (
                  <li className="text-[12px] text-slate-400">{copy.moreCount(feedback.length - DELETE_SUMMARY_MAX)}</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full bg-brand py-2.5 text-[12.5px] font-bold text-white hover:bg-brand-dark"
        >
          {copy.cancel}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-full border border-slate-200 bg-surface py-2.5 text-[12.5px] font-bold text-slate-500 hover:bg-slate-50"
        >
          {copy.deleteSummaryProceed}
        </button>
      </div>
    </div>
  )
}

function DeleteConfirmStep({ onBack, onConfirmed, deleting, error }) {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const phrase = copy.deleteConfirmPhrase
  const [text, setText] = useState('')
  const matched = text === phrase

  return (
    <div className="w-full max-w-[560px] rounded-3xl bg-surface p-8 shadow-popup">
      <h3 className="text-[15px] font-bold text-slate-900">{copy.deleteConfirmTitle}</h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500 sm:whitespace-nowrap">
        {copy.deleteConfirmDesc}
      </p>
      <p className="mt-4 text-[12.5px] text-slate-600">
        {copy.deleteConfirmBefore}<span className="font-bold text-rose-500">{phrase}</span>{copy.deleteConfirmAfter}
      </p>
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={deleting}
        placeholder={phrase}
        className="mt-2.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-rose-400 disabled:opacity-60"
      />
      {error && <p className="mt-2 text-[12px] text-rose-500">{error}</p>}
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={deleting}
          className="flex-1 rounded-full border border-slate-200 py-2.5 text-[12.5px] font-bold text-slate-600 hover:bg-slate-50"
        >
          {copy.back}
        </button>
        <button
          type="button"
          disabled={!matched || deleting}
          onClick={onConfirmed}
          className="flex-1 rounded-full bg-rose-500 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-200"
        >
          {deleting ? copy.deleteProcessing : copy.deleteAccountButton}
        </button>
      </div>
    </div>
  )
}

function DeleteAccountModal({ onClose, onDeleted }) {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const [step, setStep] = useState('summary') // 'summary' | 'confirm'
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirmed() {
    setDeleting(true)
    setError('')
    try {
      await deleteAccount()
      onDeleted()
    } catch (err) {
      setError(err.response?.data?.message || copy.deleteErrorGeneric)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      {step === 'summary' ? (
        <DeleteSummaryStep onCancel={onClose} onNext={() => setStep('confirm')} />
      ) : (
        <DeleteConfirmStep onBack={() => setStep('summary')} onConfirmed={handleConfirmed} deleting={deleting} error={error} />
      )}
    </div>
  )
}

// 이메일 알림 허용이 부모, 나머지 3개는 자식 — 부모가 꺼지면 자식도 전부 꺼지고 조작 불가.
// 무엇이든 끄는 조작에는 확인 팝업을 먼저 띄운다.
function getNotifChildren(copy) {
  return [
    { key: 'feedback', label: copy.notifFeedback },
    { key: 'recommend', label: copy.notifRecommend },
    { key: 'event', label: copy.notifEvent },
  ]
}

function notificationSettingsFromUser(user) {
  return {
    email: user?.notifyEmail ?? true,
    feedback: user?.notifyFeedback ?? true,
    recommend: user?.notifyRecommend ?? true,
    event: user?.notifyEvent ?? false,
  }
}

function ProfileTab({ user }) {
  const { setUser } = useAuth()
  const { language, setLanguage } = useLanguage()
  const copy = T[language] ?? T.en
  const loginProviders = getLoginProviders(copy)
  const notifChildren = getNotifChildren(copy)
  const [nickname, setNickname] = useState(user?.name || '')
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameError, setNicknameError] = useState('')
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const [notif, setNotif] = useState(() => notificationSettingsFromUser(user))
  const [notifSaving, setNotifSaving] = useState(false)
  const [confirmOff, setConfirmOff] = useState(null) // { key, label } | null
  const [passwordEditing, setPasswordEditing] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(''), 1800)
  }

  async function handleSaveNickname() {
    const trimmed = nickname.trim()
    if (!trimmed) {
      setNicknameError(copy.nicknameErrorEmpty)
      return
    }
    setNicknameSaving(true)
    setNicknameError('')
    try {
      const updated = await updateProfile({ name: trimmed })
      setUser(updated)
      setNickname(updated.name)
      setEditingNickname(false)
      showToast(copy.toastNicknameChanged)
    } catch (err) {
      setNicknameError(err.response?.data?.message || copy.nicknameErrorGeneric)
    } finally {
      setNicknameSaving(false)
    }
  }

  async function handleChangeLanguage(code) {
    try {
      const updated = await updateProfile({ preferredLanguage: code })
      setUser(updated)
    } catch (err) {
      showToast(err.response?.data?.message || copy.languageSaveError)
    }
  }

  // 계정에 저장된 언어가 이 브라우저의 로컬 설정(localStorage)과 다르면 계정 쪽을 기준으로 맞춘다
  useEffect(() => {
    if (user?.preferredLanguage && user.preferredLanguage !== language) {
      setLanguage(user.preferredLanguage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.preferredLanguage])

  // GET /auth/me 및 PUT /auth/notifications의 응답을 화면 상태에 그대로 반영한다.
  useEffect(() => {
    setNotif({
      email: user?.notifyEmail ?? true,
      feedback: user?.notifyFeedback ?? true,
      recommend: user?.notifyRecommend ?? true,
      event: user?.notifyEvent ?? false,
    })
  }, [user?.notifyEmail, user?.notifyFeedback, user?.notifyRecommend, user?.notifyEvent])

  async function persistNotificationSettings(next) {
    setNotifSaving(true)
    try {
      const updated = await updateNotificationSettings({
        notifyEmail: next.email,
        notifyFeedback: next.feedback,
        notifyRecommend: next.recommend,
        notifyEvent: next.event,
      })
      setUser(updated)
      setNotif(notificationSettingsFromUser(updated))
      showToast(copy.toastNotifSaved)
    } catch (err) {
      showToast(err.response?.data?.message || copy.notifSaveErrorGeneric)
    } finally {
      setNotifSaving(false)
    }
  }

  function requestToggle(key, label, checked) {
    if (notifSaving) return
    if (checked) {
      // 켜져 있던 걸 끄는 조작만 확인을 받는다 — 켜는 건 바로 반영
      setConfirmOff({ key, label })
    } else if (key === 'email') {
      // 부모를 켜면 자식 3개도 함께 켜진다 (끌 때와 대칭)
      persistNotificationSettings({ email: true, feedback: true, recommend: true, event: true })
    } else {
      persistNotificationSettings({ ...notif, [key]: true })
    }
  }

  function confirmTurnOff() {
    const { key } = confirmOff
    if (key === 'email') {
      persistNotificationSettings({ email: false, feedback: false, recommend: false, event: false })
    } else {
      persistNotificationSettings({ ...notif, [key]: false })
    }
    setConfirmOff(null)
  }

  return (
    <>
      <Card className="p-8">
        {/* 카드 자체는 nav바 폭에 맞춰 넓어지되, 행 내용은 너무 헐렁해 보이지 않게 폭을 한 번 더 제한 */}
        <div className="max-w-[760px]">
        <SettingRow label={copy.labelProfilePhoto}>
          <ProfilePhotoRow
            user={user}
            nickname={nickname}
            onUpdated={(me, message) => {
              setUser(me)
              showToast(message)
            }}
            onError={showToast}
          />
        </SettingRow>

        <SettingRow label={copy.labelNickname}>
          {editingNickname ? (
            <>
              <input
                autoFocus
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={nicknameSaving}
                className="h-9 w-40 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-700 outline-none focus:border-brand disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => {
                  setNickname(user?.name || '')
                  setNicknameError('')
                  setEditingNickname(false)
                }}
                disabled={nicknameSaving}
                className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-bold text-slate-500 hover:bg-slate-200"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveNickname}
                disabled={nicknameSaving}
                className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-[12px] font-bold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {nicknameSaving ? copy.genericSaving : copy.doneButton}
              </button>
              {nicknameError && <p className="w-full text-[12px] text-rose-500">{nicknameError}</p>}
            </>
          ) : (
            <>
              <span className="text-[13px] text-slate-700">{nickname}</span>
              <button
                type="button"
                onClick={() => setEditingNickname(true)}
                className="shrink-0 rounded-full bg-brand-light px-3 py-1.5 text-[12px] font-bold text-brand hover:bg-brand-light/70"
              >
                {copy.changeButton}
              </button>
            </>
          )}
        </SettingRow>

        <SettingRow label={copy.labelEmail}>
          {/* 목업 더미 텍스트("test1234@example.com") 대신 값이 없을 때만 옅은 회색 대시로 */}
          <span className={`text-[13px] ${user?.email ? 'text-slate-500' : 'text-slate-300'}`}>{user?.email || '—'}</span>
        </SettingRow>

        <SettingRow label={copy.labelPassword}>
          <span className="text-[13px] tracking-widest text-slate-400">••••••••</span>
          <button
            type="button"
            onClick={() => setPasswordEditing((v) => !v)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
              passwordEditing ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-brand-light text-brand hover:bg-brand-light/70'
            }`}
          >
            {passwordEditing ? copy.cancel : copy.changeButton}
          </button>
        </SettingRow>
        <PasswordInlinePanel
          open={passwordEditing}
          onSaved={() => {
            setPasswordEditing(false)
            showToast(copy.toastPasswordChanged)
          }}
        />

        <SettingRow label={copy.labelLoginInfo}>
          {loginProviders.map((p) => {
            const providers = Array.isArray(user?.authProviders) ? user.authProviders.map((provider) => String(provider).toUpperCase()) : []
            const connected = providers.includes(p.authProvider)
            return (
              <span
                key={p.key}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold"
                style={connected ? p.style : { background: '#F1F5F9', color: '#94A3B8' }}
              >
                <Icon icon={p.icon} width={14} />
                {p.label}
              </span>
            )
          })}
        </SettingRow>

        <SettingRow label={copy.labelLanguage}>
          <LanguageDropdown onPersist={handleChangeLanguage} />
        </SettingRow>

        <SettingRow label={copy.labelNotifSettings}>
          <div className="flex flex-col gap-3">
            <NotifToggle
              label={copy.notifEmailAllow}
              checked={notif.email}
              onChange={() => requestToggle('email', copy.notifEmailAllow, notif.email)}
              disabled={notifSaving}
            />
            <div className="flex flex-col gap-2.5 border-l-2 border-slate-100 pl-3">
              {notifChildren.map((n) => (
                <NotifToggle
                  key={n.key}
                  label={n.label}
                  checked={notif.email && notif[n.key]}
                  disabled={!notif.email || notifSaving}
                  onChange={() => requestToggle(n.key, n.label, notif[n.key])}
                />
              ))}
            </div>
          </div>
        </SettingRow>

        <SettingRow label={copy.labelAccount}>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="text-[12px] font-medium text-slate-400 underline underline-offset-2 transition-colors hover:text-rose-500"
          >
            {copy.deleteAccountButton}
          </button>
        </SettingRow>
        </div>
      </Card>

      {confirmOff && (
        <ConfirmDialog
          title={confirmOff.key === 'email' ? copy.emailNotifOffTitle : copy.notifOffTitle(confirmOff.label)}
          description={
            confirmOff.key === 'email'
              ? copy.emailNotifOffDesc
              : copy.notifOffDesc(confirmOff.label)
          }
          onCancel={() => setConfirmOff(null)}
          onConfirm={confirmTurnOff}
          confirmDisabled={notifSaving}
        />
      )}

      {deleteModalOpen && (
        <DeleteAccountModal
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={() => {
            // 백엔드가 DELETE /api/auth/me 응답에서 인증 쿠키를 이미 정리해준다 —
            // 프론트는 전역 user만 비우면 ProtectedRoute가 알아서 /login으로 보낸다.
            setUser(null)
          }}
        />
      )}

      <div
        className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/90 px-4 py-2 text-[12.5px] font-semibold text-white shadow-popup transition-all duration-300 ${
          toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        {toast}
      </div>
    </>
  )
}

// 온보딩 PreferenceWizard와 동일한 한 문항씩 넘어가는 흐름 — 완료 시 onFinish(호출부인 PreferenceTab)가
// updatePreferences로 실제 저장한다.
function PreferenceEditWizard({ answers, onCancel, onFinish, saving, error }) {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const STEPS = getSteps(copy, getPreferenceOptions(language))
  const [stepIndex, setStepIndex] = useState(0)
  const [values, setValues] = useState(answers)

  const step = STEPS[stepIndex]
  const value = values[step.key]
  const isAnswered = step.multiple ? value.size > 0 : value != null
  const isLastStep = stepIndex === STEPS.length - 1

  function toggleOption(optionValue) {
    setValues((prev) => {
      if (step.multiple) {
        const next = new Set(prev[step.key])
        if (next.has(optionValue)) next.delete(optionValue)
        else next.add(optionValue)
        return { ...prev, [step.key]: next }
      }
      return { ...prev, [step.key]: optionValue }
    })
  }

  function handlePrev() {
    if (stepIndex === 0) onCancel()
    else setStepIndex((i) => i - 1)
  }

  function handleNext() {
    if (!isAnswered || saving) return
    if (isLastStep) onFinish(values)
    else setStepIndex((i) => i + 1)
  }

  return (
    <Card className="p-8">
      {/* 문항 흐름은 온보딩과 같은 집중형 UI라 넓은 카드 안에서도 중앙에 좁게 유지 */}
      <div className="mx-auto max-w-[640px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold text-slate-400">
          {stepIndex + 1}/{STEPS.length}
        </span>
        <button type="button" onClick={onCancel} className="text-[13px] font-medium text-slate-400 hover:text-slate-600">
          {copy.cancel}
        </button>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 mb-5 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand transition-all duration-300"
          style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5">
        <div className="text-center mb-5">
          <h2 className="text-[17px] sm:text-[19px] font-bold text-slate-800">
            Q{stepIndex + 1}. {step.title}
          </h2>
          {/* subtitle/중복선택 문구 유무로 헤더 높이가 문항마다 달라지지 않도록, 없을 때도 자리만 invisible로 유지 */}
          <p className={`text-[12px] text-slate-400 mt-1.5 ${step.subtitle ? '' : 'invisible'}`}>{step.subtitle || '-'}</p>
          <p className={`text-[12px] text-brand-dark font-semibold mt-1.5 ${step.multiple ? '' : 'invisible'}`}>{copy.multiSelectHint}</p>
        </div>

        <div className={`grid ${step.grid} content-start gap-2.5 min-h-[370px] sm:min-h-[270px]`}>
          {step.options.map((option) => (
            <OptionCard
              key={option.value}
              option={option}
              multiple={step.multiple}
              selected={step.multiple ? value.has(option.value) : value === option.value}
              onClick={() => toggleOption(option.value)}
            />
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-center text-[12px] text-rose-500">{error}</p>}

      <div className="flex items-center justify-between mt-5">
        <button
          type="button"
          onClick={handlePrev}
          disabled={saving}
          className="h-11 rounded-xl bg-slate-100 px-6 text-[14px] font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-60"
        >
          {copy.back}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!isAnswered || saving}
          className="h-11 rounded-xl bg-brand px-6 text-[14px] font-bold text-white hover:bg-brand-dark disabled:opacity-40"
        >
          {isLastStep ? (saving ? copy.genericSaving : copy.doneButton) : copy.nextButton}
        </button>
      </div>
      </div>
    </Card>
  )
}

// 탭을 눌렀을 때 fetch를 시작하면 로딩 중 한 줄짜리 카드로 줄었다가 다시 늘어나며
// 푸터가 튀는 게 보여서, 선호도 데이터는 페이지 진입 시점(MyPageAccountSettings)에 미리 받아온다.
function PreferenceTab({ preferences, setPreferences }) {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // 계정에 선호도가 아직 없는 채로(온보딩을 건너뛴 경우) 이 화면에 들어왔을 수도 있어 PUT이 PREF_002(없음)로
  // 실패하면 POST(create)로 한 번 더 시도한다 — 있는 계정은 항상 PUT 한 번으로 끝난다.
  async function handleFinish(values) {
    const payload = {
      travelStyle: values.travelStyle,
      budgetLevel: values.budgetLevel,
      interestTags: Array.from(values.interestTags),
      preferredRegions: Array.from(values.preferredRegions),
    }
    setSaving(true)
    setSaveError('')
    try {
      let updated
      try {
        updated = await updatePreferences(payload)
      } catch (err) {
        if (err.response?.data?.code === 'PREF_002') {
          updated = await createPreferences(payload)
        } else {
          throw err
        }
      }
      setPreferences(updated)
      setEditing(false)
    } catch (err) {
      setSaveError(err.response?.data?.message || copy.preferenceSaveError)
    } finally {
      setSaving(false)
    }
  }

  if (!preferences) {
    return (
      <Card className="flex flex-col p-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-6 border-t border-slate-100 py-10 first:border-t-0 first:pt-0">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-40" />
          </div>
        ))}
      </Card>
    )
  }

  if (editing) {
    return (
      <PreferenceEditWizard
        answers={answersFromPreferences(preferences)}
        onCancel={() => setEditing(false)}
        onFinish={handleFinish}
        saving={saving}
        error={saveError}
      />
    )
  }

  const preferenceOptions = getPreferenceOptions(language)
  const summaryRows = [
    { title: copy.summaryInterest, icon: 'solar:heart-bold', options: preferenceOptions.INTEREST_TAGS, values: preferences?.interestTags || [] },
    {
      title: copy.summaryStyle,
      icon: 'solar:routing-2-bold',
      options: preferenceOptions.TRAVEL_STYLES,
      values: preferences?.travelStyle ? [preferences.travelStyle] : [],
    },
    {
      title: copy.summaryBudget,
      icon: 'solar:wallet-money-bold',
      options: preferenceOptions.BUDGET_LEVELS,
      values: preferences?.budgetLevel ? [preferences.budgetLevel] : [],
    },
    {
      title: copy.summaryRegion,
      icon: 'solar:map-point-bold',
      options: preferenceOptions.PREFERRED_REGIONS,
      values: preferences?.preferredRegions || [],
    },
  ]

  return (
    <Card className="p-8">
      {/* 프로필 설정과 달리 여긴 좌우 대칭인 2x2 박스라 가운데 정렬 */}
      <div className="mx-auto max-w-[900px]">
      {/* 수정하기 버튼 — 예전엔 그리드 맨 아래에 있어서 눌러 보려면 다 스크롤해야 했다. 위로 올렸다. */}
      <div className="mb-5 flex justify-end border-b border-slate-100 pb-5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-xl bg-brand px-5 py-2.5 text-[12.5px] font-bold text-white hover:bg-brand-dark"
        >
          {copy.editButton}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {summaryRows.map((row) => (
          <div key={row.title} className="rounded-2xl border border-slate-100 p-6">
            <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-slate-700">
              <Icon icon={row.icon} width={15} className="shrink-0 text-brand" />
              {row.title}
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              {row.values.length > 0 ? (
                row.values.map((v) => (
                  <span
                    key={v}
                    className="flex items-center gap-2 rounded-full bg-brand-light px-3.5 py-2 text-[15px] font-bold text-brand"
                  >
                    {optionIcon(row.options, v) && <Icon icon={optionIcon(row.options, v)} width={16} />}
                    {optionLabel(row.options, v)}
                  </span>
                ))
              ) : (
                <span className="text-[14px] text-slate-400">{copy.notSet}</span>
              )}
            </div>
          </div>
        ))}
      </div>
      </div>
    </Card>
  )
}

// 마이페이지 갤러리(/mypage)와는 성격이 달라(계획·기록 관리 vs 계정 설정) 별도 경로(/mypage/settings)로
// 뗐다 — 뒤로가기는 항상 /mypage가 아니라 이 화면에 들어오기 전 페이지(navigate(-1))로 돌아간다.
export default function MyPageAccountSettings() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const SETTINGS_TABS = getSettingsTabs(copy)
  const [tab, setTab] = useState('profile')
  const [preferences, setPreferences] = useState(null)

  // 탭을 누르는 시점이 아니라 페이지 진입 시점에 미리 받아둔다 — 늦게 받으면 탭 전환 때 로딩 카드로
  // 줄었다가 늘어나며 푸터가 튀어 보인다.
  useEffect(() => {
    getPreferences()
      .then(setPreferences)
      .catch(() => setPreferences(emptyAnswers()))
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-surface text-slate-900">
      <Navbar />

      {/* 토글 좌우 끝을 Navbar 컨테이너(1200px, px-4 sm:px-6)와 맞춘다 — TourExplorePage와 동일한 패턴 */}
      <Section as="main" maxWidth="max-w-[1200px]" padding="px-4 sm:px-6" className="flex flex-1 flex-col gap-8 py-12">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={copy.backAria}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <Icon icon="mdi:chevron-left" width={20} />
          </button>
          {authLoading ? (
            <>
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </>
          ) : (
            <>
              {/* Nav바 프로필과 동일하게 닉네임 첫 글자로 표시 — 별도 프로필 사진 업로드 전 기본값 */}
              <Avatar user={user} size={36} />
              {/* 목업 더미 텍스트("nickname") 대신 값이 없을 때만 옅은 회색 대시로 */}
              <h1 className={`text-[15px] font-extrabold ${user?.name ? 'text-slate-900' : 'text-slate-300'}`}>{user?.name || '—'}</h1>
            </>
          )}
        </div>

        {/* 아래 상세 카드와 가로폭을 맞춘 풀와이드 토글 — FeedFilterBar 뷰 토글의 슬라이드 패턴은 그대로 재사용 */}
        <div className="relative flex w-full items-center gap-1 rounded-xl bg-slate-100 p-1">
          <div
            aria-hidden="true"
            className="absolute top-1 h-8 rounded-lg bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-transform duration-200 ease-out"
            style={{
              width: `calc(50% - 0.25rem)`,
              transform: `translateX(calc(${SETTINGS_TABS.findIndex((t) => t.value === tab)} * (100% + 0.25rem)))`,
            }}
          />
          {SETTINGS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-pressed={tab === t.value}
              className={`relative z-10 h-8 flex-1 rounded-lg text-[12.5px] font-bold transition-colors ${
                tab === t.value ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'profile' ? (
          <ProfileTab user={user} />
        ) : (
          <PreferenceTab preferences={preferences} setPreferences={setPreferences} />
        )}
      </Section>

      <Footer />
      <ChatbotWidget />
      <FloatingCart />
    </div>
  )
}
