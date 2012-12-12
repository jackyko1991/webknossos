### define
../buffer_utils : BufferUtils
###


class Recolor

  DESCRIPTION : "Recolors the input with a colormap or a single color value"

  PARAMETER :
    input :
      rgba: "Uint8Array"
    colorMapName: "string"
    r : "uint8"
    g : "uint8"
    b : "uint8"
    a : "uint8"

  assetHandler : null


  constructor : (@assetHandler) ->


  execute : ({ input : { rgba }, colorMapName, r, g, b, a }) ->

    if colorMapName?
      @applyColorMap( rgba, colorMapName )

    if r? and g? and b? and a?
      @applySingleColor( rgba, r, g, b, a )


  applyColorMap : ( rgba, colorMapName ) ->

    colorMap = @assetHandler.getPixelArray(colorMapName)

    for i in [0...rgba.length] by 4
      r = rgba[i + 0]
      g = rgba[i + 1]
      b = rgba[i + 2]
      a = rgba[i + 3]
      luminance = Math.floor((0.2126 * r) + (0.7152 * g) + (0.0722 * b)) * 4
      rgba[i + 0] = colorMap[luminance + 0]
      rgba[i + 1] = colorMap[luminance + 1]
      rgba[i + 2] = colorMap[luminance + 2]
      rgba[i + 3] = colorMap[luminance + 3]

    rgba


  applySingleColor : ( rgba, r, g, b, a ) ->

    colorBuffer = new Uint8Array( rgba.length )

    for i in [0...rgba.length] by 4

      colorBuffer[i + 0] = r
      colorBuffer[i + 1] = g
      colorBuffer[i + 2] = b
      colorBuffer[i + 3] = a

    BufferUtils.alphaBlendBuffer(rgba, colorBuffer)

    rgba

