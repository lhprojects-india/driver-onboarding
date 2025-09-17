
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";

const About = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate("/onboarding-stages");
  };

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          About Laundryheap
        </h2>
        
        <div className="text-center space-y-6 max-w-md animate-fade-in">
          <p>
            Operating in 12 countries and 21 cities, we've amassed over 
            150,000 downloads and fulfilled over 2 million orders.
          </p>
          
          <p>
            Laundryheap is the world's fastest laundry and dry cleaning 
            service, with next-day delivery. Our customers find laundry 
            easier than ever through our app or website, available 24/7.
          </p>
          
          <p>
            We provide peace of mind with round-the-clock service and 
            dedicated customer support. Our drivers collect laundry from 
            doorsteps and transport it to local facilities for washing, ensuring 
            smooth deliveries within 24 hours.
          </p>
        </div>
        
        <Button 
          onClick={handleContinue}
          className="w-full max-w-xs mt-6 md:mt-12"
        >
          Acknowledged
        </Button>
      </div>
    </PageLayout>
  );
};

export default About;
