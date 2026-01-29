import React, { useState } from 'react';
import { Mail, Phone, User, Pen, Shield, Bell, CheckCircle, XCircle, RefreshCw, FileText, DollarSign, AlertTriangle, UserPlus, Heart, Gift } from 'lucide-react';

const notificationData = {
  version: "1.0",
  description: "알림 시나리오 정의 (독자/작가/관리자)",
  channels: ["email", "sms"],
  scenarios: {
    reader: [
      { event: "proposal_accepted", title: "제안 채택", description: "내 제안이 작가에 의해 채택됨", channel: "email", template: "제안하신 '{storyTitle}'의 제안이 채택되었습니다." },
      { event: "proposal_rejected", title: "제안 거절", description: "내 제안이 작가에 의해 거절됨", channel: "email", template: "제안하신 '{storyTitle}'의 제안이 거절되었습니다. 잉크가 환불됩니다." },
      { event: "refund_completed", title: "환불 완료", description: "제안 거절/작품 완성으로 잉크 환불됨", channel: "email", template: "{amount} Ink가 환불되었습니다." },
      { event: "report_resolved", title: "신고 처리 완료", description: "내 신고가 처리됨", channel: "email", template: "신고하신 건이 처리 완료되었습니다." },
      { event: "episode_published", title: "참여 작품 완성", description: "내가 참여한 에피소드가 완성됨", channel: "email", template: "참여하신 '{storyTitle}'의 새 에피소드가 완성되었습니다." }
    ],
    creator: [
      { event: "new_proposal", title: "새 제안 접수", description: "내 에피소드에 새 제안이 들어옴", channel: "email", template: "'{episodeTitle}'에 새 제안이 접수되었습니다." },
      { event: "new_backing", title: "새 지지", description: "내 에피소드의 제안에 지지가 추가됨", channel: "email", template: "'{episodeTitle}'의 제안에 새 지지가 추가되었습니다." },
      { event: "new_sponsor", title: "새 후원", description: "내 에피소드에 직접 후원이 들어옴", channel: "email", template: "'{episodeTitle}'에 {amount} Ink 후원이 도착했습니다." },
      { event: "settlement_completed", title: "정산 완료", description: "출금 요청이 승인되어 입금 완료됨", channel: "email", template: "정산 요청하신 ₩{amount}이 입금 완료되었습니다." },
      { event: "settlement_rejected", title: "정산 거절", description: "출금 요청이 거절됨", channel: "email", template: "정산 요청이 거절되었습니다. 사유: {reason}" }
    ],
    admin: [
      { event: "new_report", title: "새 신고 접수", description: "새 사용자 신고가 접수됨", channel: "email", template: "새 신고가 접수되었습니다. 유형: {reportType}" },
      { event: "withdrawal_request", title: "출금 요청", description: "크리에이터가 출금을 요청함", channel: "email", template: "{creatorName}님이 ₩{amount} 출금을 요청했습니다." },
      { event: "new_user_signup", title: "신규 가입", description: "새 사용자가 가입함", channel: "email", template: "새 사용자가 가입했습니다: {email}" }
    ]
  }
};

const roleConfig = {
  reader: {
    label: "독자 (Reader)",
    icon: User,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    headerBg: "bg-blue-500",
    headerText: "text-white",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700"
  },
  creator: {
    label: "작가 (Creator)",
    icon: Pen,
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    headerBg: "bg-purple-500",
    headerText: "text-white",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700"
  },
  admin: {
    label: "관리자 (Admin)",
    icon: Shield,
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    headerBg: "bg-orange-500",
    headerText: "text-white",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-700"
  }
};

const eventIcons = {
  proposal_accepted: CheckCircle,
  proposal_rejected: XCircle,
  refund_completed: RefreshCw,
  report_resolved: FileText,
  episode_published: FileText,
  new_proposal: Bell,
  new_backing: Heart,
  new_sponsor: Gift,
  settlement_completed: DollarSign,
  settlement_rejected: XCircle,
  new_report: AlertTriangle,
  withdrawal_request: DollarSign,
  new_user_signup: UserPlus
};

const ChannelBadge = ({ channel }) => {
  const isEmail = channel === "email";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isEmail ? "bg-gray-100 text-gray-700" : "bg-green-100 text-green-700"
    }`}>
      {isEmail ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
      {channel.toUpperCase()}
    </span>
  );
};

const EventCard = ({ event, roleKey, isSelected, onClick }) => {
  const config = roleConfig[roleKey];
  const EventIcon = eventIcons[event.event] || Bell;

  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
        ${isSelected
          ? `${config.borderColor} ${config.bgColor} shadow-lg scale-105`
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.iconBg}`}>
          <EventIcon className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 text-sm">{event.title}</h4>
            <ChannelBadge channel={event.channel} />
          </div>
          <p className="text-xs text-gray-500 mb-2">{event.description}</p>
          <code className={`text-xs px-2 py-1 rounded ${config.badgeBg} ${config.badgeText} font-mono`}>
            {event.event}
          </code>
        </div>
      </div>

      {isSelected && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            <span className="font-medium">템플릿:</span>
          </p>
          <p className="text-sm text-gray-800 mt-1 bg-white p-2 rounded border border-gray-100">
            {event.template}
          </p>
        </div>
      )}
    </div>
  );
};

const RoleSection = ({ roleKey, events, selectedEvent, onSelectEvent }) => {
  const config = roleConfig[roleKey];
  const RoleIcon = config.icon;

  return (
    <div className={`rounded-xl overflow-hidden border ${config.borderColor} shadow-sm`}>
      <div className={`${config.headerBg} ${config.headerText} px-5 py-4`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <RoleIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">{config.label}</h3>
            <p className="text-sm opacity-90">{events.length}개 알림 이벤트</p>
          </div>
        </div>
      </div>

      <div className={`${config.bgColor} p-4`}>
        <div className="grid gap-3">
          {events.map((event) => (
            <EventCard
              key={event.event}
              event={event}
              roleKey={roleKey}
              isSelected={selectedEvent?.event === event.event && selectedEvent?.role === roleKey}
              onClick={() => onSelectEvent({ ...event, role: roleKey })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const StatsSummary = () => {
  const totalEvents = Object.values(notificationData.scenarios).flat().length;
  const roleStats = Object.entries(notificationData.scenarios).map(([key, events]) => ({
    role: key,
    count: events.length,
    config: roleConfig[key]
  }));

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl p-4 text-white">
        <div className="text-3xl font-bold">{totalEvents}</div>
        <div className="text-sm opacity-80">전체 알림 이벤트</div>
      </div>
      {roleStats.map(({ role, count, config }) => {
        const Icon = config.icon;
        return (
          <div key={role} className={`${config.bgColor} ${config.borderColor} border rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
              <span className={`text-2xl font-bold ${config.iconColor}`}>{count}</span>
            </div>
            <div className="text-sm text-gray-600">{config.label}</div>
          </div>
        );
      })}
    </div>
  );
};

const NotificationScenarioDiagram = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Bell className="w-7 h-7 text-indigo-600" />
                알림 시나리오 다이어그램
              </h1>
              <p className="text-gray-500 mt-1">{notificationData.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">버전:</span>
              <span className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">{notificationData.version}</span>
            </div>
          </div>

          {/* 뷰 모드 토글 */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              카드 뷰
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              테이블 뷰
            </button>
          </div>
        </div>

        {/* 통계 요약 */}
        <StatsSummary />

        {/* 카드 뷰 */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.entries(notificationData.scenarios).map(([roleKey, events]) => (
              <RoleSection
                key={roleKey}
                roleKey={roleKey}
                events={events}
                selectedEvent={selectedEvent}
                onSelectEvent={setSelectedEvent}
              />
            ))}
          </div>
        )}

        {/* 테이블 뷰 */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">역할</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">이벤트</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">제목</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">설명</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">채널</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">템플릿</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(notificationData.scenarios).flatMap(([roleKey, events]) =>
                  events.map((event, idx) => {
                    const config = roleConfig[roleKey];
                    const RoleIcon = config.icon;
                    return (
                      <tr key={`${roleKey}-${event.event}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {idx === 0 && (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.badgeBg} ${config.badgeText}`}>
                              <RoleIcon className="w-3 h-3" />
                              {config.label.split(' ')[0]}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                            {event.event}
                          </code>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 text-sm">{event.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{event.description}</td>
                        <td className="px-4 py-3">
                          <ChannelBadge channel={event.channel} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={event.template}>
                          {event.template}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 지원 채널 범례 */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">지원 채널</h3>
          <div className="flex gap-4">
            {notificationData.channels.map(channel => (
              <div key={channel} className="flex items-center gap-2">
                {channel === 'email' ? (
                  <Mail className="w-4 h-4 text-gray-600" />
                ) : (
                  <Phone className="w-4 h-4 text-gray-400" />
                )}
                <span className={`text-sm ${channel === 'email' ? 'text-gray-700' : 'text-gray-400'}`}>
                  {channel.toUpperCase()}
                  {channel === 'sms' && ' (준비중)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationScenarioDiagram;
