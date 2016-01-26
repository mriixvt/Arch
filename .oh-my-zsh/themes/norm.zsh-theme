PROMPT='$FG[237]------------------------------------------------------------%{$reset_color%}
%{$FG[110]%}λ %m %{$FG[112]%}%c %{$fg[yellow]%}→ $(git_prompt_info)%{$reset_color%}'
RPS1='${return_code}'

# right prompt
if type "virtualenv_prompt_info" > /dev/null
then
	RPROMPT='$(virtualenv_prompt_info)$FG[245]%D{%H:%M:%S}%{$reset_color%}%'
else
	RPROMPT='$my_gray%n@%m%{$reset_color%}%'
fi

ZSH_THEME_GIT_PROMPT_PREFIX="%{$fg[blue]%}git %{$fg[red]%}"
ZSH_THEME_GIT_PROMPT_SUFFIX="%{$fg[yellow]%} → %{$reset_color%}"
