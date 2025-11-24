
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";

const About = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate("/role");
  };

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          About Laundryheap
        </h2>
        
      
        <div className="text-center space-y-6 max-w-md animate-fade-in">
          <p>
          Operating across 14 countries and 23 cities, we’ve achieved over 150,000 app downloads and successfully completed more than 2 million orders.
          </p>
          <p>   
Laundryheap is the world’s fastest laundry and dry-cleaning service, offering next-day delivery. Through our 24/7 app and website, customers can enjoy a seamless laundry experience anytime, anywhere.
          </p>
          <p>
We deliver peace of mind with continuous service and dedicated customer support. Our professional drivers collect laundry directly from customers’ doorsteps and transport it to our trusted partner laundry facilities, ensuring efficient turnaround and delivery within 24 hours.
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
