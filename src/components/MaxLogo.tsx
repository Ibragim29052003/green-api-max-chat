interface MaxLogoProps {
  size?: 'small' | 'large'
}

export const MaxLogo = ({ size = 'small' }: MaxLogoProps) => (
  <div className={`max-logo max-logo--${size}`} aria-label="MAX" role="img">
    <span />
  </div>
)
