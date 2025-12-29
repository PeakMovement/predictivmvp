export const FindHelp = () => {
  return (
    <div className="fixed inset-0 bottom-[72px] sm:bottom-[80px] bg-background">
      <iframe
        src="https://predictiv-medic-finder.netlify.app"
        title="Medical Finder"
        className="w-full h-full border-0"
        allow="geolocation"
        loading="eager"
      />
    </div>
  );
};
