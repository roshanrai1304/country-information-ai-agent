export default function AboutPage() {
  const steps = [
    {
      step: '01',
      title: 'Intent Identification',
      desc: 'Your question is parsed by Google Gemini to extract the target country and the specific data fields being requested. Fields are normalised to a fixed vocabulary: population, capital, currency, language, region, flag, area, timezone, calling code, continent.',
    },
    {
      step: '02',
      title: 'Tool Invocation',
      desc: 'The agent calls the REST Countries API directly with only the fields you requested. No cached or pre-trained data is used. Every answer is grounded in live, real-time API data.',
    },
    {
      step: '03',
      title: 'Answer Synthesis',
      desc: 'Gemini synthesises a natural language answer using only the data returned by the API. The model is instructed never to invent or hallucinate information. If a field is missing from the API, the agent says so explicitly.',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-10">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Methodology</p>
        <h1 className="text-3xl font-black text-navy mb-4">How The Archivist Works</h1>
        <p className="text-gray-600 leading-relaxed">
          The Archivist is an AI-powered intelligence agent built on a three-node LangGraph pipeline.
          Every answer is grounded in live data — never model memory.
        </p>
      </div>

      <div className="space-y-4 mb-10">
        {steps.map(({ step, title, desc }) => (
          <div key={step} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex gap-6">
            <span className="text-4xl font-black text-gray-100 flex-shrink-0 leading-none mt-1">{step}</span>
            <div>
              <h3 className="font-bold text-navy mb-2">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-navy rounded-2xl p-8 text-white mb-6">
        <h3 className="font-bold text-lg mb-3">Data Source</h3>
        <p className="text-white/80 text-sm leading-relaxed mb-4">
          All country data is sourced exclusively from the REST Countries API (restcountries.com/v3.1).
          This is a public, free API with no authentication required. Population figures may lag
          real-world data by 1–2 years depending on the upstream source.
        </p>
        <a
          href="https://restcountries.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-white/60 underline hover:text-white transition-colors"
        >
          restcountries.com/v3.1 ↗
        </a>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-bold text-navy mb-3">Known Limitations</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-2"><span className="text-gray-400">—</span>Session history only — closes with the browser tab.</li>
          <li className="flex gap-2"><span className="text-gray-400">—</span>No multi-turn context — each question is independent.</li>
          <li className="flex gap-2"><span className="text-gray-400">—</span>Single data source — if REST Countries is down, answers are unavailable.</li>
          <li className="flex gap-2"><span className="text-gray-400">—</span>No caching — every question hits both Gemini and the REST API.</li>
        </ul>
      </div>
    </div>
  )
}
