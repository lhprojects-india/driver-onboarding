
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";

const FeeStructure = () => {
  const navigate = useNavigate();

  const handleHappy = () => {
    navigate("/thank-you");
  };

  const handleNeedClarification = () => {
    navigate("/thank-you");
  };

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          Fee structure
        </h2>
        
        <div className="text-center space-y-6 max-w-md animate-fade-in">
          <p>
            Pay per task policy - The more number of tasks completed, the higher the earning potential.
          </p>
          
          <p>
            For the City of Dublin, our widely available blocks are 4-hour blocks, either medium or low density.
          </p>
          
          <p>
            4 hour Medium density blocks are offered with a fee of €65 inclusive of mileage, with 12 minimum/included tasks. An extra task fee of €5.7 per task completed after the 12th task
          </p>
          
          <p>
            4 hour low-density blocks are offered with a fee of €70 inclusive of mileage, with 11 minimum/included tasks. An extra task fee of €6.7 per task completed after the 11th task
          </p>
          
          <p>
            We also offer blocks with more combinations of 3 and hours with high, medium, and low densities. Our Fleet associate will reach out to you once this session is complete.
          </p>
        </div>
        
        <div className="w-full flex flex-col items-center space-y-4 mt-4 md:mt-8">
          <Button 
            onClick={handleHappy}
            className="w-full max-w-xs"
          >
            I'm happy with the paystructure
          </Button>
          
          <Button 
            onClick={handleNeedClarification}
            className="w-full max-w-xs"
          >
            I need further clarification
          </Button>
        </div>
      </div>
    </PageLayout>
  );
};

export default FeeStructure;
