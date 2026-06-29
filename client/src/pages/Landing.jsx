import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col justify-center">
      {/* Decorative blurred blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-20 text-center relative z-10 space-y-12">
        <div className="space-y-4">
          <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider inline-block">
            ⚡ Powered by Real-Time Data &amp; Geolocation
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-indigo-100 to-emerald-200 max-w-4xl mx-auto leading-tight">
            Smart Hospital Bed &amp; Ambulance Platform
          </h1>
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Find available critical-care beds instantly, book slots in outpatient wards,
            and request ambulances with live GPS tracking. Seamless coordination when it matters most.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {/* Patient Portal Card */}
          <Link
            to="/login/patient"
            className="group bg-slate-900/40 backdrop-blur-md hover:bg-slate-800/50 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-6 text-left transition-all duration-300 transform hover:-translate-y-1.5 shadow-lg shadow-black/20"
          >
            <div className="text-3xl bg-blue-500/10 w-14 h-14 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform mb-6">
              🏥
            </div>
            <h2 className="text-lg font-bold text-slate-100 group-hover:text-blue-400 transition-colors mb-2">Patient Portal</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Locate nearby approved hospitals, book OPD tokens, request empty beds, and track live ambulances.
            </p>
          </Link>

          {/* Hospital Portal Card */}
          <Link
            to="/login/hospital"
            className="group bg-slate-900/40 backdrop-blur-md hover:bg-slate-800/50 border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-6 text-left transition-all duration-300 transform hover:-translate-y-1.5 shadow-lg shadow-black/20"
          >
            <div className="text-3xl bg-emerald-500/10 w-14 h-14 rounded-2xl flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform mb-6">
              📋
            </div>
            <h2 className="text-lg font-bold text-slate-100 group-hover:text-emerald-400 transition-colors mb-2">Hospital Admin</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track live bed status, print QR codes, review pending requests, and dispatch your ambulance fleet.
            </p>
          </Link>

          {/* Driver Portal Card */}
          <Link
            to="/login/driver"
            className="group bg-slate-900/40 backdrop-blur-md hover:bg-slate-800/50 border border-slate-800 hover:border-orange-500/50 rounded-3xl p-6 text-left transition-all duration-300 transform hover:-translate-y-1.5 shadow-lg shadow-black/20"
          >
            <div className="text-3xl bg-orange-500/10 w-14 h-14 rounded-2xl flex items-center justify-center border border-orange-500/20 group-hover:scale-110 transition-transform mb-6">
              🚑
            </div>
            <h2 className="text-lg font-bold text-slate-100 group-hover:text-orange-400 transition-colors mb-2">Driver Portal</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Receive patient emergency calls, navigate with real-time routing, and share GPS tracking.
            </p>
          </Link>

          {/* Super Admin Card */}
          <Link
            to="/login/admin"
            className="group bg-slate-900/40 backdrop-blur-md hover:bg-slate-800/50 border border-slate-800 hover:border-purple-500/50 rounded-3xl p-6 text-left transition-all duration-300 transform hover:-translate-y-1.5 shadow-lg shadow-black/20"
          >
            <div className="text-3xl bg-purple-500/10 w-14 h-14 rounded-2xl flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform mb-6">
              🛡️
            </div>
            <h2 className="text-lg font-bold text-slate-100 group-hover:text-purple-400 transition-colors mb-2">Super-Admin</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Audit pending registrations, verify licenses, and manage hospital credentials globally.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

