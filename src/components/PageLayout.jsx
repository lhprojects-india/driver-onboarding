import LaundryheapLogo from "../assets/logo";

function PageLayout({ children, title, subtitle, compact = false }) {
  return (
    <div className="laundryheap-page min-h-screen flex flex-col">
      <LaundryheapLogo/>
      
      {title && (
        <h1 className={`text-center text-lg md:text-xl mt-2 md:mt-6 mb-4 md:mb-8 font-medium animate-slide-up ${compact ? "text-2xl md:text-3xl" : ""}`}>
          {title}
        </h1>
      )}
      
      {subtitle && (
        <h2 className="text-center text-base md:text-lg mt-2 md:mt-6 mb-4 md:mb-8 font-medium animate-slide-up">
          {subtitle}
        </h2>
      )}
      
      <div className="flex-1 w-full flex flex-col items-center justify-center px-4">
        {children}
      </div>
    </div>
  );
}

export default PageLayout;
