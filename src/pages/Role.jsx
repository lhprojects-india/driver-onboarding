
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";

const Role = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate("/blocks-classification");
  };

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          Your role with us
        </h2>
        
        <div className="text-center space-y-6 max-w-md animate-fade-in">
          <p>
            As a partner driver, you're not just delivering laundry but also spreading smiles to our happy customers!
            And the best part? The steps of your role are simple.
          </p>
          
          <p>
            Start by driving your vehicle to the designated facility, like a laundromat.
          </p>
          
          <p>
            Then, pick up the clean orders that are ready to be delivered to customers.
          </p>
          
          <p>
            Start your route to deliver processed orders and Pick up unprocessed orders from our valued customers.
          </p>
          
          <p>
            Finally, return to the facility to drop off unprocessed orders collected in your route for processing.
          </p>
        </div>
        
        <Button 
          onClick={handleContinue}
          className="w-full max-w-xs mt-4 md:mt-8"
        >
          I understand my role
        </Button>
      </div>
    </PageLayout>
  );
};

export default Role;
