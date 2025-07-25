import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const Loader = () => (
  <div className="text-white text-4xl">
    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
  </div>
);

export default Loader;