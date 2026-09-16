import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ChatbotWidget from '../components/ChatbotWidget'
import FloatingCart from '../components/FloatingCart'
import Section from '../components/ui/Section'
import Card from '../components/ui/Card'
import { useLanguage } from '../i18n'

// 페이지 전역 문구
const T = {
  ko: {
    pageTitle: '고객지원',
  },
  en: {
    pageTitle: 'Support',
  },
}

// 탭 value는 언어와 무관 — 쿼리 파라미터·상태 비교에 그대로 쓰고, label만 번역한다
const TAB_VALUES = ['faq', 'terms', 'privacy']

function getTabs(language) {
  if (language !== 'ko') {
    return [
      { value: 'faq', label: 'FAQ' },
      { value: 'terms', label: 'Terms of Service' },
      { value: 'privacy', label: 'Privacy Policy' },
    ]
  }
  return [
    { value: 'faq', label: '자주 묻는 질문' },
    { value: 'terms', label: '이용약관' },
    { value: 'privacy', label: '개인정보처리방침' },
  ]
}

// 각 문항에 언어와 무관한 id를 둬서, 언어가 바뀌어도 아코디언 열림 상태의 key가 안정적으로 유지되게 한다
const FAQ_SECTIONS = {
  ko: [
    {
      id: 'account',
      category: '회원가입 · 로그인',
      items: [
        {
          id: 'account-signup',
          q: '회원가입은 어떻게 하나요?',
          a: '이메일과 비밀번호로 가입하거나, 카카오·Google·Apple 계정으로 간편하게 가입할 수 있어요. 소셜 계정으로 가입하면 별도의 비밀번호 설정 없이 바로 로그인할 수 있어요.',
        },
        {
          id: 'account-forgot-password',
          q: '비밀번호를 잊어버렸어요.',
          a: '로그인 화면의 비밀번호 찾기를 통해 가입하신 이메일로 재설정 링크를 받으실 수 있어요. 소셜 계정으로 가입하신 경우 별도의 비밀번호가 없으니 해당 소셜 로그인으로 이용해주세요.',
        },
        {
          id: 'account-delete',
          q: '회원 탈퇴는 어떻게 하나요?',
          a: '마이페이지 > 설정에서 탈퇴를 진행할 수 있어요. 탈퇴 시 작성하신 계획, 기록, 참견 등 대부분의 데이터는 삭제되며 복구할 수 없어요. 다만 접속 로그 등 일부 정보는 통신비밀보호법에 따라 3개월간 보관될 수 있어요.',
        },
      ],
    },
    {
      id: 'planning',
      category: '여행 계획',
      items: [
        {
          id: 'planning-create',
          q: '여행 계획은 어떻게 만드나요?',
          a: '나의 계획 페이지에서 새 계획 만들기를 누르고 여행 제목과 기간(출발일·종료일)을 입력하면 Day별 일정이 자동으로 생성돼요. 이후 관심 있는 장소를 장바구니에 담아두고, 원하는 Day로 드래그 앤 드롭하면서 일정을 채워나갈 수 있어요.',
        },
        {
          id: 'planning-edit-dates',
          q: '여행 기간을 나중에 수정할 수 있나요?',
          a: '네, 계획 상세 화면에서 기간을 수정할 수 있어요. 다만 기간을 변경하면 이미 짜둔 Day별 일정이 초기화될 수 있으니 참고해주세요.',
        },
        {
          id: 'planning-from-cart',
          q: '장바구니에 담아둔 장소만으로 바로 계획을 만들 수도 있나요?',
          a: '네. 여행지 탐색에서 담아둔 장바구니를 기반으로 새 계획을 바로 만들면, Day별 일정에 담아둔 장소들이 함께 채워진 상태로 시작할 수 있어요.',
        },
        {
          id: 'planning-visibility',
          q: '만든 계획은 나만 볼 수 있나요?',
          a: '계획 상세 화면 또는 마이페이지에서 "나만보기 / 전체보기" 버튼으로 공개 범위를 전환할 수 있어요. 나만보기로 설정하면 본인만 볼 수 있고, 전체보기로 전환하면 여행자 피드에 노출되어 다른 이용자들이 계획을 보고 참견(피드백)을 남길 수 있어요.',
        },
      ],
    },
    {
      id: 'feed',
      category: '여행자 피드 · 참견',
      items: [
        {
          id: 'feed-what',
          q: '여행자 피드는 무엇인가요?',
          a: '다른 이용자들이 공유한 여행 계획과 여행 기록을 모아볼 수 있는 공간이에요. 전체/계획/기록으로 필터링해서 볼 수 있어요.',
        },
        {
          id: 'feed-feedback',
          q: '참견(피드백)이 뭔가요?',
          a: '다른 이용자의 계획이나 기록에 남기는 댓글 및 반응이에요. 동선이 좋은지, 더 가볼만한 곳은 없는지 등 여행에 도움이 되는 의견을 주고받을 수 있어요.',
        },
        {
          id: 'feed-received',
          q: '내가 받은 참견은 어디서 확인하나요?',
          a: '화면 상단 알림 아이콘(종 모양) 또는 내 계획 상세 화면에서 받은 참견을 확인할 수 있어요.',
        },
        {
          id: 'feed-record-upload',
          q: '여행 기록(사진 후기)은 어떻게 올리나요?',
          a: '완료한 계획의 기록 업로드 메뉴에서 사진과 후기를 함께 등록할 수 있어요. 등록한 기록은 여행자 피드에서 다른 이용자들과 공유돼요.',
        },
      ],
    },
    {
      id: 'travelbot',
      category: '트레블봇',
      items: [
        {
          id: 'travelbot-what',
          q: '트레블봇이 뭔가요?',
          a: '화면 우측 하단의 챗봇 아이콘을 누르면 나오는 여행 계획 상담 도우미예요. 궁금한 점을 메시지로 물어보면 여행 계획 짜는 걸 도와줘요.',
        },
      ],
    },
    {
      id: 'saved',
      category: '보관함 · 마이페이지',
      items: [
        {
          id: 'saved-what',
          q: '보관함은 무엇인가요?',
          a: '마음에 드는 다른 이용자의 계획을 스크랩해서 모아두는 공간이에요. 나의 여행 > 보관함 메뉴에서 확인할 수 있어요.',
        },
        {
          id: 'saved-count-mismatch',
          q: '내 프로필에서 계획과 기록 개수가 다르게 보여요.',
          a: '마이페이지에서는 내가 만든 계획 수와 작성한 기록 수를 각각 보여드려요. 계획을 세웠다고 해서 자동으로 기록이 생기는 건 아니고, 기록은 별도로 업로드해야 해요.',
        },
        {
          id: 'saved-preferences',
          q: '여행 선호도(관심사, 스타일 등)는 왜 입력하나요?',
          a: '관심 태그, 여행 스타일, 예산 수준, 선호 지역 등을 입력하면 이를 바탕으로 더 취향에 맞는 여행지와 계획을 추천해드려요. 선택 항목이라 온보딩 과정에서 건너뛸 수 있고, 이후 마이페이지에서 언제든지 입력하거나 수정할 수 있어요.',
        },
      ],
    },
    {
      id: 'destinations',
      category: '여행지 정보',
      items: [
        {
          id: 'destinations-info-mismatch',
          q: '여행지 정보(주소, 운영시간 등)가 실제와 달라요.',
          a: '여행지 탐색에 제공되는 정보는 공공 관광정보 데이터를 기반으로 하고 있어 실제 정보와 차이가 있을 수 있어요. 방문 전 반드시 공식 홈페이지 등에서 최신 정보를 다시 확인해주세요.',
        },
        {
          id: 'destinations-festivals',
          q: '원하는 지역의 축제·행사 정보도 볼 수 있나요?',
          a: '네, 여행지 탐색에서 축제·행사 테마를 선택하면 기간별로 진행 중이거나 예정된 행사를 확인할 수 있어요.',
        },
      ],
    },
    {
      id: 'other',
      category: '기타 문의',
      items: [
        {
          id: 'other-bug-report',
          q: '버그를 발견했거나 건의하고 싶은 기능이 있어요.',
          a: '고객지원 페이지의 이메일(traveltackleteam@gmail.com)로 언제든지 알려주세요. 소중한 의견 감사히 반영할게요.',
        },
        {
          id: 'other-partnership',
          q: '광고나 제휴 문의는 어디로 하나요?',
          a: 'traveltackleteam@gmail.com으로 문의 내용을 보내주시면 담당자가 확인 후 순차적으로 답변드려요.',
        },
      ],
    },
  ],
  en: [
    {
      id: 'account',
      category: 'Account & Login',
      items: [
        {
          id: 'account-signup',
          q: 'How do I sign up?',
          a: 'You can sign up with an email and password, or quickly sign up using your Kakao, Google, or Apple account. Signing up with a social account lets you log in right away without setting a separate password.',
        },
        {
          id: 'account-forgot-password',
          q: 'I forgot my password.',
          a: 'You can request a reset link to your registered email using the "Forgot password" option on the login screen. If you signed up with a social account, there is no separate password — please continue using that social login instead.',
        },
        {
          id: 'account-delete',
          q: 'How do I delete my account?',
          a: "You can delete your account from My Page > Settings. When you delete your account, most of your data — including plans, records, and feedback you've written — is deleted and cannot be recovered. However, certain information such as access logs may be retained for 3 months in accordance with the Protection of Communications Secrets Act.",
        },
      ],
    },
    {
      id: 'planning',
      category: 'Trip Planning',
      items: [
        {
          id: 'planning-create',
          q: 'How do I create a trip plan?',
          a: 'Tap "Create new plan" on the My Trips page, then enter a trip title and dates (start and end date), and a day-by-day itinerary is generated automatically. From there, you can save places you\'re interested in to your cart and drag and drop them onto the day you want to build out your itinerary.',
        },
        {
          id: 'planning-edit-dates',
          q: 'Can I change the trip dates later?',
          a: "Yes, you can edit the dates from the plan detail screen. Please note that changing the dates may reset the day-by-day itinerary you've already put together.",
        },
        {
          id: 'planning-from-cart',
          q: "Can I create a plan directly from the places I've saved to my cart?",
          a: 'Yes. If you create a new plan based on the cart you\'ve built up in Explore, it starts out with those saved places already filled into the day-by-day itinerary.',
        },
        {
          id: 'planning-visibility',
          q: 'Can only I see the plans I make?',
          a: 'You can switch the visibility using the "Private / Public" toggle on the plan detail screen or My Page. Setting a plan to private means only you can see it, while switching it to public exposes it on the Traveler Feed so other users can view it and leave feedback.',
        },
      ],
    },
    {
      id: 'feed',
      category: 'Traveler Feed & Feedback',
      items: [
        {
          id: 'feed-what',
          q: 'What is the Traveler Feed?',
          a: "It's a space where you can browse trip plans and travel records shared by other users. You can filter by All, Plans, or Records.",
        },
        {
          id: 'feed-feedback',
          q: 'What is "feedback"?',
          a: "It's the comments and reactions you can leave on other users' plans or records. You can exchange helpful opinions about things like whether the route makes sense or if there are other places worth visiting.",
        },
        {
          id: 'feed-received',
          q: "Where can I see the feedback I've received?",
          a: "You can check the feedback you've received from the bell-shaped notification icon at the top of the screen, or from your plan's detail screen.",
        },
        {
          id: 'feed-record-upload',
          q: 'How do I upload a travel record (photo review)?',
          a: 'From a completed plan\'s "Upload record" menu, you can register photos together with your review. Once uploaded, your record is shared with other users on the Traveler Feed.',
        },
      ],
    },
    {
      id: 'travelbot',
      category: 'TravelBot',
      items: [
        {
          id: 'travelbot-what',
          q: 'What is TravelBot?',
          a: "It's a trip-planning assistant that appears when you tap the chatbot icon at the bottom right of the screen. Send it a message with your question, and it will help you plan your trip.",
        },
      ],
    },
    {
      id: 'saved',
      category: 'Saved & My Page',
      items: [
        {
          id: 'saved-what',
          q: 'What is Saved?',
          a: "It's a space where you can bookmark other users' plans that you like and keep them in one place. You can find it under My Trips > Saved.",
        },
        {
          id: 'saved-count-mismatch',
          q: 'The number of plans and records on my profile looks different.',
          a: "My Page shows the number of plans you've created and the number of records you've written separately. Creating a plan doesn't automatically create a record — records need to be uploaded separately.",
        },
        {
          id: 'saved-preferences',
          q: 'Why do I enter travel preferences (interests, style, etc.)?',
          a: 'Entering things like interest tags, travel style, budget level, and preferred regions helps us recommend destinations and plans that better match your taste. This is optional, so you can skip it during onboarding and enter or edit it anytime later from My Page.',
        },
      ],
    },
    {
      id: 'destinations',
      category: 'Destination Information',
      items: [
        {
          id: 'destinations-info-mismatch',
          q: "The destination information (address, hours, etc.) doesn't match reality.",
          a: 'The information provided in Explore is based on public tourism data, so it may differ from actual information. Please be sure to check the latest information on the official website or similar sources before visiting.',
        },
        {
          id: 'destinations-festivals',
          q: "Can I see festival and event information for a region I'm interested in?",
          a: 'Yes, if you select the Festivals & Events theme in Explore, you can check ongoing or upcoming events by date.',
        },
      ],
    },
    {
      id: 'other',
      category: 'Other Inquiries',
      items: [
        {
          id: 'other-bug-report',
          q: 'I found a bug or have a feature suggestion.',
          a: 'Please let us know anytime at the email address on the Support page (traveltackleteam@gmail.com). We appreciate your feedback and will do our best to reflect it.',
        },
        {
          id: 'other-partnership',
          q: 'Where can I send advertising or partnership inquiries?',
          a: 'Please send your inquiry to traveltackleteam@gmail.com, and our team will review it and respond in order.',
        },
      ],
    },
  ],
}

const TERMS_TEXT = {
  ko: `제1조 (목적)

이 약관은 트레블 참견(이하 "운영팀")이 제공하는 여행 계획, 여행자 피드 등 일체의 서비스(이하 "서비스")의 이용조건 및 절차, 운영팀과 회원 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)

이 약관에서 사용하는 용어의 정의는 다음과 같습니다.
1. "서비스"란 운영팀이 제공하는 여행지 탐색, 여행 계획 작성, 여행자 피드, 참견(피드백), 장바구니, 보관함 등 일체의 서비스를 의미합니다.
2. "회원"이란 이 약관에 동의하고 운영팀과 이용계약을 체결하여 아이디를 부여받은 자를 말합니다.
3. "계획"이란 회원이 서비스 내에서 작성한 일자별 여행 일정 콘텐츠를 말합니다.
4. "기록"이란 회원이 실제 다녀온 여행에 대해 작성한 후기·사진 등의 콘텐츠를 말합니다.
5. "참견"이란 회원이 다른 회원의 계획 또는 기록에 남기는 댓글, 반응 등의 피드백을 말합니다.
6. "장바구니"란 회원이 여행지 탐색 중 관심 있는 장소를 임시로 담아두는 기능을 말합니다.
7. "보관함"이란 회원이 자신 또는 다른 회원의 계획을 스크랩하여 모아두는 기능을 말합니다.

제3조 (약관의 효력 및 변경)

① 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력을 발생합니다.

② 운영팀은 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있으며, 약관이 변경되는 경우 적용일자 및 변경사유를 명시하여 적용일자 7일 전부터 서비스 내 공지사항을 통해 공지합니다. 다만 회원에게 불리하게 변경되는 경우에는 적용일자 30일 전부터 공지합니다.

③ 회원이 변경된 약관에 동의하지 않는 경우 회원은 이용계약을 해지(회원 탈퇴)할 수 있으며, 계속 서비스를 이용하는 경우 약관의 변경에 동의한 것으로 간주합니다.

제4조 (회원가입)

① 회원가입은 이용자가 이메일 인증 또는 카카오, Google, Apple 등 소셜 계정을 통해 회원가입 절차를 진행하고, 이 약관 및 개인정보처리방침의 내용에 동의함으로써 신청되며, 운영팀이 해당 신청을 승낙함으로써 체결됩니다.

② 운영팀은 다음 각 호에 해당하는 신청에 대하여는 승낙을 하지 않거나 사후에 이용계약을 해지할 수 있습니다.
1. 가입신청자가 이전에 이 약관에 의하여 회원자격을 상실한 적이 있는 경우
2. 실명이 아니거나 타인의 명의를 이용한 경우
3. 허위의 정보를 기재하거나, 운영팀이 제시하는 내용을 기재하지 않은 경우

제5조 (회원 탈퇴 및 자격 상실)

① 회원은 마이페이지 내 탈퇴 메뉴를 통해 언제든지 이용계약 해지(탈퇴)를 신청할 수 있으며, 운영팀은 관련 법령이 정하는 바에 따라 이를 즉시 처리합니다.

② 회원 탈퇴 시 회원이 작성한 계획, 기록, 참견 등 게시물 및 개인정보는 관련 법령 및 개인정보처리방침에 따라 처리되며, 별도의 보관 사유가 없는 한 지체 없이 삭제되어 복구할 수 없습니다.

③ 회원이 다음 각 호의 사유에 해당하는 경우, 운영팀은 회원자격을 제한 및 정지시키거나 이용계약을 해지할 수 있습니다.
1. 타인의 정보를 도용한 경우
2. 서비스를 이용하여 법령 또는 이 약관이 금지하는 행위를 한 경우
3. 다른 회원에게 지속적으로 불쾌감을 주는 참견(피드백)을 반복적으로 남기는 경우

제6조 (서비스의 제공 및 변경)

① 운영팀은 다음과 같은 서비스를 제공합니다.
1. 여행지 탐색 서비스
2. 여행 계획 작성 및 관리 서비스
3. 여행자 피드를 통한 계획·기록 공유 서비스
4. 참견(피드백) 서비스
5. 장바구니 및 보관함 서비스
6. 챗봇(트레블봇)을 통한 여행 계획 상담 서비스
7. 기타 운영팀이 추가 개발하거나 제휴를 통해 회원에게 제공하는 서비스

② 운영팀은 운영상, 기술상의 필요에 따라 제공하고 있는 서비스의 전부 또는 일부를 변경할 수 있으며, 이 경우 변경 사유 및 내용을 사전에 공지합니다.

③ 서비스 내 여행지 정보는 공공 관광정보 데이터를 기반으로 제공되며, 실제 정보(운영시간, 휴무일, 주소 등)와 차이가 있을 수 있습니다. 회원은 방문 전 반드시 별도로 확인하시기 바랍니다.

제7조 (서비스의 중단)

운영팀은 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있으며, 이 경우 사전에 공지합니다. 다만 사전에 공지할 수 없는 부득이한 사유가 있는 경우 사후에 공지할 수 있습니다.

제8조 (회원의 의무)

① 회원은 다음 행위를 하여서는 안 됩니다.
1. 신청 또는 변경 시 허위내용의 등록
2. 타인의 정보 도용
3. 운영팀이 게시한 정보의 무단 변경
4. 운영팀이 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시
5. 운영팀 및 기타 제3자의 저작권 등 지적재산권에 대한 침해
6. 운영팀 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위
7. 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위
8. 다른 회원의 계획, 기록에 대해 근거 없이 비방하거나 모욕적인 참견(피드백)을 남기는 행위

② 회원은 관계법령, 이 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항, 운영팀이 통지하는 사항 등을 준수하여야 하며, 기타 운영팀의 업무에 방해되는 행위를 하여서는 안 됩니다.

제9조 (게시물의 저작권 및 관리)

① 회원이 서비스 내에 작성한 계획, 기록, 사진, 참견 등 게시물의 저작권은 해당 게시물의 작성자인 회원에게 귀속됩니다.

② 회원이 서비스 내에 게시물을 등록하는 경우, 운영팀은 서비스 운영 및 공모전 출품·시연 목적의 범위 내에서 게시물을 사용할 수 있는 권리를 회원으로부터 부여받은 것으로 봅니다. 다만 회원이 언제든지 해당 게시물을 삭제할 수 있으며, 삭제 시 운영팀은 그 게시물의 사용을 중단합니다.

③ 운영팀은 회원의 게시물이 다음 각 호에 해당한다고 판단되는 경우 사전 통지 없이 삭제하거나 이동 또는 등록을 거부할 수 있습니다.
1. 다른 회원 또는 제3자를 비방하거나 명예를 손상시키는 내용인 경우
2. 공공질서 및 미풍양속에 위반되는 내용을 유포하거나 링크시키는 경우
3. 타인의 저작권 등 권리를 침해하는 내용인 경우

제10조 (개인정보보호)

운영팀은 관련 법령이 정하는 바에 따라 회원의 개인정보를 보호하기 위해 노력하며, 개인정보의 보호 및 사용에 대해서는 관련 법령 및 운영팀의 개인정보처리방침이 적용됩니다.

제11조 (운영팀의 의무)

① 운영팀은 관련 법령과 이 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 계속적이고 안정적으로 서비스를 제공하기 위하여 최선을 다해 노력합니다.

② 운영팀은 회원이 안전하게 서비스를 이용할 수 있도록 개인정보 보호를 위한 기본적인 보안 조치를 갖추기 위해 노력합니다.

제12조 (면책조항)

① 운영팀은 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.

② 운영팀은 서비스 내에서 제공되는 관광지 정보(공공 데이터 기반)의 정확성, 최신성에 대해 보증하지 않으며, 이를 신뢰하여 발생한 회원의 손해에 대해 책임을 지지 않습니다.

③ 운영팀은 회원 간 또는 회원과 제3자 상호간에 서비스를 매개로 발생한 분쟁에 대해 개입할 의무가 없으며, 이로 인한 손해를 배상할 책임이 없습니다.

④ 운영팀은 회원이 서비스와 관련하여 게재한 정보, 자료, 사실의 신뢰도, 정확성 등 내용에 대하여는 책임을 지지 않습니다.

제13조 (분쟁해결)

이 약관과 관련하여 운영팀과 회원 간에 분쟁이 발생한 경우, 운영팀과 회원은 분쟁의 해결을 위해 성실히 협의합니다. 협의가 이루어지지 않을 경우 관련 법령 및 상관례에 따릅니다.

부칙
본 약관은 2026년 9월 17일부터 시행합니다.

최초 시행일자: 2026년 9월 17일
최종 수정일자: 2026년 9월 17일`,
  en: `Article 1 (Purpose)

These Terms and Conditions ("Terms") set out the conditions and procedures for using the trip planning, traveler feed, and all other services (the "Service") provided by Travel Tackle (the "Operating Team"), the rights, obligations, and responsibilities between the Operating Team and members, and other necessary matters.

Article 2 (Definitions)

The definitions of the terms used in these Terms are as follows.
1. "Service" means all services provided by the Operating Team, including destination exploration, trip plan creation, the traveler feed, feedback, the cart, and saved items.
2. "Member" means a person who has agreed to these Terms and entered into a service agreement with the Operating Team, and has been assigned an ID.
3. "Plan" means the day-by-day travel itinerary content that a member creates within the Service.
4. "Record" means content such as reviews and photos that a member writes about a trip they have actually taken.
5. "Feedback" means comments, reactions, and other input that a member leaves on another member's plan or record.
6. "Cart" means the feature that lets a member temporarily save places of interest while exploring destinations.
7. "Saved" means the feature that lets a member bookmark and collect their own or other members' plans.

Article 3 (Effect and Amendment of the Terms)

① These Terms take effect by being posted on the Service screen or otherwise notified to members.

② The Operating Team may amend these Terms within the scope permitted by applicable law when necessary. When the Terms are amended, the Operating Team will specify the effective date and reason for the change and announce it through in-service notices starting 7 days before the effective date. However, changes unfavorable to members will be announced starting 30 days before the effective date.

③ If a member does not agree to the amended Terms, the member may terminate the service agreement (delete their account). Continued use of the Service after the amendment is deemed acceptance of the amended Terms.

Article 4 (Membership Registration)

① Membership registration is applied for when a user completes the registration process via email verification or a social account such as Kakao, Google, or Apple, and agrees to the content of these Terms and the Privacy Policy; it is concluded when the Operating Team accepts the application.

② The Operating Team may withhold acceptance of, or subsequently terminate the service agreement for, an application that falls under any of the following:
1. The applicant has previously lost membership status under these Terms.
2. The application does not use the applicant's real name or uses another person's name.
3. The application contains false information, or omits information requested by the Operating Team.

Article 5 (Withdrawal and Loss of Membership)

① A member may request termination of the service agreement (withdrawal) at any time through the withdrawal menu in My Page, and the Operating Team will process this immediately in accordance with applicable law.

② Upon a member's withdrawal, posts such as plans, records, and feedback written by the member, as well as their personal information, are processed in accordance with applicable law and the Privacy Policy, and are deleted without delay and cannot be recovered, unless there is a separate reason for retention.

③ If a member falls under any of the following, the Operating Team may restrict or suspend the member's status or terminate the service agreement:
1. The member has used another person's information without authorization.
2. The member has used the Service to engage in conduct prohibited by law or these Terms.
3. The member has repeatedly left feedback that causes ongoing discomfort to other members.

Article 6 (Provision and Change of the Service)

① The Operating Team provides the following services:
1. Destination exploration service
2. Trip plan creation and management service
3. Plan/record sharing service through the traveler feed
4. Feedback service
5. Cart and saved items service
6. Trip-planning consultation service via chatbot (TravelBot)
7. Other services that the Operating Team additionally develops or provides to members through partnerships

② The Operating Team may change all or part of the Service being provided for operational or technical reasons, and in such cases will announce the reason and details of the change in advance.

③ Destination information within the Service is provided based on public tourism data and may differ from actual information (operating hours, closed days, address, etc.). Members should always verify such information separately before visiting.

Article 7 (Suspension of the Service)

The Operating Team may temporarily suspend provision of the Service in the event of maintenance, replacement, or failure of computer or other information and communication equipment, or a communication outage, and will provide advance notice in such cases. However, if there is an unavoidable reason that prevents advance notice, notice may be given afterward.

Article 8 (Obligations of Members)

① Members must not engage in any of the following:
1. Registering false information when applying for or changing membership
2. Using another person's information without authorization
3. Altering information posted by the Operating Team without authorization
4. Transmitting or posting information (such as computer programs) other than that designated by the Operating Team
5. Infringing on the intellectual property rights, including copyrights, of the Operating Team or third parties
6. Damaging the reputation of, or interfering with the business of, the Operating Team or other third parties
7. Disclosing or posting obscene or violent messages, images, audio, or other information contrary to public order and morals on the Service
8. Leaving feedback on another member's plan or record that is baseless slander or is insulting

② Members must comply with applicable laws, the provisions of these Terms, usage guidelines, precautions announced in relation to the Service, and matters notified by the Operating Team, and must not engage in any other conduct that interferes with the Operating Team's business.

Article 9 (Copyright and Management of Posts)

① Copyright in posts such as plans, records, photos, and feedback that a member creates within the Service belongs to the member who authored the post.

② When a member registers a post within the Service, the Operating Team is deemed to have been granted the right to use the post within the scope of operating the Service and for the purpose of submission to or demonstration at contests. However, the member may delete the post at any time, and upon deletion the Operating Team will stop using that post.

③ If the Operating Team determines that a member's post falls under any of the following, it may delete, relocate, or refuse to register the post without prior notice:
1. Content that slanders or damages the reputation of another member or a third party
2. Content that disseminates or links to material that violates public order or good morals
3. Content that infringes on another person's copyright or other rights

Article 10 (Protection of Personal Information)

The Operating Team endeavors to protect members' personal information in accordance with applicable law, and the protection and use of personal information is governed by applicable law and the Operating Team's Privacy Policy.

Article 11 (Obligations of the Operating Team)

① The Operating Team will not engage in conduct prohibited by applicable law and these Terms, or conduct contrary to public morals, and will do its best to provide the Service continuously and reliably.

② The Operating Team endeavors to put in place basic security measures to protect personal information so that members can use the Service safely.

Article 12 (Disclaimer)

① The Operating Team is exempted from responsibility for providing the Service if it is unable to do so due to a natural disaster or equivalent force majeure.

② The Operating Team does not guarantee the accuracy or timeliness of destination information (based on public data) provided within the Service, and is not liable for any damage a member incurs from relying on it.

③ The Operating Team is not obligated to intervene in disputes arising between members, or between a member and a third party, in connection with the Service, and is not liable to compensate for any resulting damages.

④ The Operating Team is not responsible for the reliability or accuracy of information, materials, or facts that a member posts in connection with the Service.

Article 13 (Dispute Resolution)

If a dispute arises between the Operating Team and a member in connection with these Terms, the Operating Team and the member shall discuss the matter in good faith to resolve it. If no agreement is reached, the matter shall be governed by applicable law and customary practice.

Addendum
These Terms take effect on September 17, 2026.

Date first effective: September 17, 2026
Date last amended: September 17, 2026`,
}

const PRIVACY_TEXT = {
  ko: `트레블 참견(이하 "운영팀")은 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관련 법령의 취지를 준수하고자 노력합니다. 운영팀은 개인정보 처리방침을 통하여 이용자가 제공하는 개인정보가 어떠한 목적과 방식으로 이용되고 있으며, 개인정보 보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.

제1조 (수집하는 개인정보 항목 및 수집방법)

① 운영팀은 회원가입, 서비스 이용 과정에서 다음과 같은 개인정보를 수집합니다.

1. 이메일 회원가입 시
- 필수항목: 이메일 주소(인증 절차 포함), 비밀번호(암호화 저장), 이름(닉네임), 국적
- 선택항목: 알림 수신 동의 여부(전체 동의 및 피드백·여행 추천·이벤트 세부 항목)

2. 소셜 로그인(카카오, Google, Apple) 이용 시
- 각 소셜 로그인 제공자로부터 전달받는 식별자(고유 ID), 이메일, 이름(닉네임) 등 제공 동의 항목

3. 서비스 이용 과정에서 생성·수집되는 정보
- 여행 선호도 정보: 관심 태그, 여행 스타일, 예산 수준, 선호 지역
- 선호 언어 설정
- 여행 계획 정보: 여행 제목, 기간, 일자별 방문 장소, 메모
- 여행 기록 및 게시물: 업로드한 사진, 후기 텍스트
- 참견(피드백) 내용: 다른 이용자의 계획에 남긴 댓글, 이모지 반응
- 장바구니·보관함에 담은 여행지 정보
- 챗봇(트레블봇) 상담 이용 시 대화 내용
- 서비스 이용기록: 접속 로그, 접속 IP, 쿠키, 기기 정보, 서비스 이용시간

② 개인정보는 다음과 같은 방법으로 수집합니다.
- 홈페이지 회원가입 및 정보 수정 과정에서의 입력
- 소셜 로그인 연동 시 제공자로부터의 정보 수신
- 서비스 이용 과정에서 자동으로 생성되어 수집되는 정보

제2조 (개인정보의 수집 및 이용목적)

운영팀은 수집한 개인정보를 다음의 목적을 위해 이용합니다.

1. 회원 관리
- 회원제 서비스 이용에 따른 본인 확인, 개인 식별, 부정 이용 방지, 가입 의사 확인
- 소셜 로그인 계정 연동 및 관리

2. 서비스 제공
- 여행 계획 생성·수정·조회 등 핵심 기능 제공
- 여행자 피드를 통한 계획/기록 공유 및 참견(피드백) 기능 제공
- 여행 선호도 및 국적 정보를 활용한 맞춤 여행지·계획 추천
- 선호 언어 설정에 따른 서비스 언어 제공
- 장바구니·보관함 기능 제공
- 챗봇(트레블봇)을 통한 여행 계획 상담 지원
- 알림(참견 등록, 계획 반응 등) 발송

3. 서비스 개선 및 통계 분석
- 인기 지역·인기 계획 등 통계 산출 및 콘텐츠 추천 개선
- 국적별 이용 현황 통계 확인 및 외국인 이용자 대상 서비스 기획
- 서비스 이용 통계 분석을 통한 신규 기능 기획

제3조 (개인정보의 보유 및 이용기간)

① 운영팀은 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.

② 회원 탈퇴 시 운영팀은 수집한 개인정보를 지체 없이 파기합니다. 다만 다음의 정보에 대해서는 명시한 사유에 따라 명시한 기간 동안 예외적으로 보존합니다.
- 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우: 해당 수사·조사 종료 시까지
- 「통신비밀보호법」에 따른 서비스 이용 관련 개인정보(접속 로그, 접속 IP 등): 3개월

제4조 (개인정보의 제3자 제공)

운영팀은 이용자의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 이용자의 사전 동의 없이는 본래의 범위를 초과하여 처리하거나 제3자에게 제공하지 않습니다. 다만 다음의 경우는 예외로 합니다.
- 이용자가 사전에 제3자 제공에 동의한 경우
- 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우

제5조 (외부 서비스 이용)

① 운영팀은 서비스 운영을 위하여 다음과 같은 외부 서비스를 이용하고 있습니다.
- 클라우드 인프라: 서버 호스팅 및 데이터 저장
- 이메일·알림 발송: 회원 알림 메시지 발송
- 소셜 로그인 인증: 카카오, Google, Apple

② 운영팀은 위 외부 서비스를 이용함에 있어 개인정보가 본래 목적 외로 사용되지 않도록 관리하며, 관련 법령에서 정한 개인정보 보호 기준을 준수하기 위해 노력합니다.

제6조 (정보주체의 권리·의무 및 행사방법)

① 이용자는 운영팀에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
1. 개인정보 열람 요구
2. 오류 등이 있을 경우 정정 요구
3. 삭제 요구
4. 처리정지 요구

② 제1항에 따른 권리 행사는 마이페이지 내 설정 화면 또는 이메일(traveltackleteam@gmail.com)을 통하여 하실 수 있으며, 운영팀은 이에 대해 지체 없이 조치하겠습니다.

③ 이용자는 마이페이지에서 직접 닉네임, 여행 선호도 등 개인정보를 수정할 수 있으며, 회원 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다.

제7조 (개인정보의 파기)

① 운영팀은 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.

② 파기 절차 및 방법은 다음과 같습니다.
- 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제
- 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기

제8조 (개인정보의 안전성 확보조치)

운영팀은 개인정보 보호를 위해 다음과 같은 기본적인 조치를 적용하고 있습니다.
- 비밀번호 암호화 저장 및 전송구간 암호화(HTTPS) 적용
- 개인정보에 대한 접근 권한을 최소한의 인원으로 제한
- 개인정보 처리시스템 등의 접속기록 보관

제9조 (개인정보 보호책임자)

운영팀은 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.

- 개인정보 보호책임자: 트레블 참견 팀
- 이메일: traveltackleteam@gmail.com

이용자는 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게 문의하실 수 있습니다.

제10조 (개인정보처리방침의 변경)

이 개인정보처리방침은 법령·정책 또는 보안기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 시에는 개정 최소 7일 전부터 서비스 내 공지사항을 통하여 고지할 것입니다.

부칙
본 방침은 2026년 9월 17일부터 시행합니다.

최초 시행일자: 2026년 9월 17일
최종 수정일자: 2026년 9월 17일`,
  en: `Travel Tackle (the "Operating Team") places great importance on users' personal information and strives to comply with the intent of applicable laws, including the Personal Information Protection Act. Through this Privacy Policy, the Operating Team informs users of the purposes and methods for which the personal information they provide is used, and what measures are in place to protect that personal information.

Article 1 (Items and Methods of Personal Information Collected)

① The Operating Team collects the following personal information during membership registration and use of the Service.

1. When registering by email
- Required: email address (including verification), password (stored encrypted), name (nickname), nationality
- Optional: consent to receive notifications (overall consent and detailed items for feedback, travel recommendations, and events)

2. When using social login (Kakao, Google, Apple)
- Identifier (unique ID), email, name (nickname), and other items provided with consent from each social login provider

3. Information generated and collected during use of the Service
- Travel preference information: interest tags, travel style, budget level, preferred regions
- Preferred language setting
- Trip plan information: trip title, dates, places visited by day, notes
- Travel records and posts: uploaded photos, review text
- Feedback content: comments and emoji reactions left on other users' plans
- Destination information saved to the cart and saved items
- Conversation content when using the chatbot (TravelBot) consultation feature
- Service usage records: access logs, access IP, cookies, device information, service usage time

② Personal information is collected through the following methods.
- Input during website membership registration and information updates
- Receipt of information from the provider when linking a social login
- Information automatically generated and collected during use of the Service

Article 2 (Purposes of Collection and Use of Personal Information)

The Operating Team uses collected personal information for the following purposes.

1. Member management
- Identity verification, personal identification, prevention of fraudulent use, and confirmation of intent to register in connection with the use of membership-based services
- Linking and managing social login accounts

2. Service provision
- Providing core features such as creating, editing, and viewing trip plans
- Providing plan/record sharing and feedback features through the traveler feed
- Providing customized destination and plan recommendations based on travel preferences and nationality information
- Providing the Service in the user's preferred language based on their language setting
- Providing cart and saved items features
- Supporting trip-planning consultation through the chatbot (TravelBot)
- Sending notifications (new feedback, reactions to plans, etc.)

3. Service improvement and statistical analysis
- Calculating statistics such as popular regions and popular plans, and improving content recommendations
- Checking usage statistics by nationality and planning services for users from other countries
- Planning new features based on analysis of service usage statistics

Article 3 (Retention and Use Period of Personal Information)

① The Operating Team processes and retains personal information within the retention and use period required by applicable law, or the retention and use period consented to by the data subject when the personal information was collected.

② Upon a member's withdrawal, the Operating Team destroys the collected personal information without delay. However, the following information is exceptionally retained for the specified period, for the stated reason:
- Information subject to an ongoing investigation for a violation of applicable law: until the investigation concludes
- Personal information related to service use under the Protection of Communications Secrets Act (access logs, access IP, etc.): 3 months

Article 4 (Provision of Personal Information to Third Parties)

The Operating Team processes users' personal information only within the scope specified in Article 1, and does not process it beyond that scope or provide it to third parties without the user's prior consent, except in the following cases:
- Where the user has given prior consent to provision to a third party
- Where required by applicable law, or requested by an investigative agency in accordance with the procedures and methods prescribed by law for investigative purposes

Article 5 (Use of External Services)

① The Operating Team uses the following external services to operate the Service.
- Cloud infrastructure: server hosting and data storage
- Email/notification delivery: sending notification messages to members
- Social login authentication: Kakao, Google, Apple

② In using the above external services, the Operating Team manages personal information so that it is not used for purposes other than its original purpose, and strives to comply with the personal information protection standards set by applicable law.

Article 6 (Rights and Obligations of Data Subjects and How to Exercise Them)

① Users may exercise the following personal-information-related rights against the Operating Team at any time.
1. Request to view personal information
2. Request for correction if there is an error
3. Request for deletion
4. Request to suspend processing

② The rights under paragraph 1 may be exercised through the settings screen in My Page or by email (traveltackleteam@gmail.com), and the Operating Team will take action without delay.

③ Users may directly edit personal information such as their nickname and travel preferences in My Page, and may request deletion of their personal information by withdrawing their membership.

Article 7 (Destruction of Personal Information)

① The Operating Team destroys personal information without delay once it becomes unnecessary, such as when the retention period has elapsed or the processing purpose has been achieved.

② The procedure and method of destruction are as follows.
- Information in electronic file form is deleted using a technical method that prevents the records from being reproduced.
- Personal information printed on paper is destroyed by shredding or incineration.

Article 8 (Measures to Ensure the Security of Personal Information)

The Operating Team applies the following basic measures to protect personal information.
- Encrypted storage of passwords and encryption of the transmission channel (HTTPS)
- Limiting access to personal information to the minimum number of personnel necessary
- Retaining access records for personal information processing systems

Article 9 (Personal Information Protection Officer)

The Operating Team designates a Personal Information Protection Officer as follows, who takes overall responsibility for personal information processing and handles users' complaints and requests for remedies related to personal information processing.

- Personal Information Protection Officer: Travel Tackle Team
- Email: traveltackleteam@gmail.com

Users may direct any inquiries, complaints, or requests for remedies related to personal information protection arising from their use of the Service to the Personal Information Protection Officer.

Article 10 (Changes to the Privacy Policy)

If there are additions, deletions, or amendments to this Privacy Policy due to changes in laws, policy, or security technology, they will be announced through in-service notices starting at least 7 days before the amendment.

Addendum
This Policy takes effect on September 17, 2026.

Date first effective: September 17, 2026
Date last amended: September 17, 2026`,
}

// 질문을 누르면 그 항목만 펼쳐지는 아코디언 — 여러 개를 동시에 열어둘 수 있다.
function FaqAccordionItem({ q, a, open, onToggle }) {
  return (
    <Card className="overflow-hidden">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-5 text-left">
        <span className="text-[13.5px] font-bold text-slate-800">Q. {q}</span>
        <Icon
          icon="solar:alt-arrow-down-linear"
          width={14}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <p className="nav-sheet px-5 pb-5 text-[12.5px] leading-relaxed text-slate-500">A. {a}</p>}
    </Card>
  )
}

export default function SupportPage() {
  const { language } = useLanguage()
  const copy = T[language] ?? T.en
  const tabs = getTabs(language)
  const faqSections = FAQ_SECTIONS[language] ?? FAQ_SECTIONS.en
  const termsText = TERMS_TEXT[language] ?? TERMS_TEXT.en
  const privacyText = PRIVACY_TEXT[language] ?? PRIVACY_TEXT.en

  const [searchParams, setSearchParams] = useSearchParams()
  const [openQuestions, setOpenQuestions] = useState(() => new Set())
  const tab = useMemo(() => {
    const requested = searchParams.get('tab')
    return TAB_VALUES.includes(requested) ? requested : 'faq'
  }, [searchParams])

  function toggleQuestion(id) {
    setOpenQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface text-slate-900">
      <Navbar />

      <Section as="main" maxWidth="max-w-[1200px]" padding="px-4 sm:px-6" className="flex flex-1 flex-col gap-8 py-12">
        <h1 className="text-[22px] font-extrabold text-slate-900">{copy.pageTitle}</h1>

        {/* MyPageAccountSettings의 슬라이딩 필 토글과 동일한 패턴, 3탭용으로 폭만 조정 */}
        <div className="relative flex w-full items-center gap-1 rounded-xl bg-slate-100 p-1">
          <div
            aria-hidden="true"
            className="absolute top-1 h-8 rounded-lg bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-transform duration-200 ease-out"
            style={{
              width: 'calc((100% - 0.5rem) / 3)',
              transform: `translateX(calc(${tabs.findIndex((t) => t.value === tab)} * (100% + 0.25rem)))`,
            }}
          />
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSearchParams({ tab: t.value })}
              aria-pressed={tab === t.value}
              className={`relative z-10 h-8 flex-1 rounded-lg text-[12.5px] font-bold transition-colors ${
                tab === t.value ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'faq' && (
          <div className="flex flex-col gap-8">
            {faqSections.map((section) => (
              <div key={section.id}>
                <h2 className="text-[13px] font-bold text-brand-dark">{section.category}</h2>
                <div className="mt-3 flex flex-col gap-3">
                  {section.items.map((item) => (
                    <FaqAccordionItem
                      key={item.id}
                      q={item.q}
                      a={item.a}
                      open={openQuestions.has(item.id)}
                      onToggle={() => toggleQuestion(item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'terms' && (
          <Card className="whitespace-pre-line p-6 text-[12.5px] leading-relaxed text-slate-600">{termsText}</Card>
        )}

        {tab === 'privacy' && (
          <Card className="whitespace-pre-line p-6 text-[12.5px] leading-relaxed text-slate-600">{privacyText}</Card>
        )}
      </Section>

      <Footer />
      <ChatbotWidget />
      <FloatingCart />
    </div>
  )
}
