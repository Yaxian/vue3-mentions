const combineRegExps = regExps => {
  const serializedRegexParser = /^\/(.+)\/(\w+)?$/
  return new RegExp(
    regExps
      .map(regex => {
        const [, regexString, regexFlags] = serializedRegexParser.exec(
          regex.toString(),
        )

        if (process.env.NODE_ENV !== 'production') {
          if (regexFlags) {
            console.warn(
              `RegExp flags are not supported. Change /${regexString}/${regexFlags} into /${regexString}/`,
            )
          }
        }

        return `(${regexString})`
      })
      .join('|'),
    'g',
  )
}

export default combineRegExps
