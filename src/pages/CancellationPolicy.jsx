
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";

const CancellationPolicy = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate("/fee-structure");
  };

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          48 hour Cancelation policy and Payment cycle
        </h2>
        
        <div className="text-center space-y-6 max-w-md animate-fade-in">
          <p>
            Any cancelation ahead of 48 hours to the start of the block will not be chargeable
          </p>
          
          <p>
            Any cancelation within 48 hours to start of the block will be chargeable to a fee equaling the block fee.
          </p>
          
          <p>
            For example, If a block worth €100 is canceled within 48 hours to the start of the block, a charge of 100€ is chargeable towards the cancelation.
          </p>
          
          <p>
            The payment cycle is done every week. Payment for the current week will be credited to your bank account on the following Friday or by Monday.
          </p>
        </div>
        
        <Button 
          onClick={handleContinue}
          className="w-full max-w-xs mt-4 md:mt-8"
        >
          Proceed to the next step
        </Button>
      </div>
    </PageLayout>
  );
};

export default CancellationPolicy;
