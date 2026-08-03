export default function ChartsSection() {
  return (
    <div className="w-full" style={{ height: 'calc(100vh - 7rem)' }}>
      <iframe
        src="https://charts.deriv.com"
        title="Deriv Charts"
        className="w-full h-full border-0"
        allow="clipboard-write; camera; geolocation"
      />
    </div>
  );
}
