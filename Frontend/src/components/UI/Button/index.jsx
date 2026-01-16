import styles from './Button.module.scss';

const Button = ({
  children,
  className,
  loading,
  disabled,
  onClick,
  type = 'button',
  variant = 'primary', // primary, secondary, outline, danger, ghost
  size = 'md',        // sm, md, lg
  ...props
}) => {
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className || ''}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};

export default Button;