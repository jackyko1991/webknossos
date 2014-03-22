### define
three : THREE
./abstract_plane_material_factory : AbstractPlaneMaterialFactory
###

class PlaneMaterialFactory extends AbstractPlaneMaterialFactory


  setupAttributesAndUniforms : ->

    super()

    @uniforms = _.extend @uniforms,
      offset :
        type : "v2"
        value : new THREE.Vector2(0, 0)
      repeat :
        type : "v2"
        value : new THREE.Vector2(1, 1)
      alpha :
        type : "f"
        value : 0


  createTextures : ->

    # create textures
    @textures = {}
    for name, binary of @model.binary
      bytes = binary.targetBitDepth >> 3
      @textures[name] = @createDataTexture(@tWidth, bytes)
      @textures[name].category = binary.category

    for name, texture of @textures
      @uniforms[name + "_texture"] = {
        type : "t"
        value : texture
      }
      unless name == "segmentation"
        color = _.map @model.binary[name].color, (e) -> e / 255
        @uniforms[name + "_weight"] = {
          type : "f"
          value : 1
        }
        @uniforms[name + "_color"] = {
          type : "v3"
          value : new THREE.Vector3(color...)
        }


  makeMaterial : (options) ->

    super(options)

    @material.setColorInterpolation = (interpolation) =>
      for name, texture of @textures
        if texture.category == "color"
          texture.magFilter = interpolation
          texture.needsUpdate = true

    @material.setScaleParams = ({offset, repeat}) =>
      @uniforms.offset.value.set offset.x, offset.y
      @uniforms.repeat.value.set repeat.x, repeat.y

    @material.setSegmentationAlpha = (alpha) =>
      @uniforms.alpha.value = alpha


  setupChangeListeners : ->

    super()

    for binary in @model.getColorBinaries()
      do (binary) =>
        binary.on
          newColor : (color) =>
            color = _.map color, (e) -> e / 255
            @uniforms[binary.name + "_color"].value = new THREE.Vector3(color...)


  getFragmentShader : ->

    colorLayerNames = _.map @model.getColorBinaries(), (b) -> b.name

    return _.template(
      """
      <% _.each(layers, function(name) { %>
        uniform sampler2D <%= name %>_texture;
        uniform vec3 <%= name %>_color;
        uniform float <%= name %>_weight;
      <% }) %>

      <% if (hasSegmentation) { %>
        uniform sampler2D segmentation_texture;
      <% } %>

      uniform vec2 offset, repeat;
      uniform float alpha, brightness, contrast;
      varying vec2 vUv;

      /* Inspired from: https://github.com/McManning/WebGL-Platformer/blob/master/shaders/main.frag */
      vec4 hsv_to_rgb(vec4 HSV)
      {
        vec4 RGB; /* = HSV.z; */

        float h = HSV.x;
        float s = HSV.y;
        float v = HSV.z;

        float i = floor(h);
        float f = h - i;

        float p = (1.0 - s);
        float q = (1.0 - s * f);
        float t = (1.0 - s * (1.0 - f));

        if (i == 0.0) { RGB = vec4(1.0, t, p, 1.0); }
        else if (i == 1.0) { RGB = vec4(q, 1.0, p, 1.0); }
        else if (i == 2.0) { RGB = vec4(p, 1.0, t, 1.0); }
        else if (i == 3.0) { RGB = vec4(p, q, 1.0, 1.0); }
        else if (i == 4.0) { RGB = vec4(t, p, 1.0, 1.0); }
        else /* i == -1 */ { RGB = vec4(1.0, p, q, 1.0); }

        RGB *= v;

        return RGB;
      }

      void main() {
        float golden_ratio = 0.618033988749895;
        float color_value  = 0.0;

        <% if (hasSegmentation) { %>
          vec4 volume_color = texture2D(segmentation_texture, vUv * repeat + offset);
          float id = (volume_color.r * 255.0);
        <% } else { %>
          float id = 0.0;
        <% } %>


        /* Get Color Value(s) */

        <% if (isRgb) { %>
          vec4 data_color = texture2D( color_texture, vUv * repeat + offset);

        <% } else { %>
          vec3 data_color = vec3(0.0, 0.0, 0.0);

          <% _.each(layers, function(name){ %>

            /* Get grayscale value */
            color_value = texture2D( <%= name %>_texture, vUv * repeat + offset).r;

            /* Brightness / Contrast Transformation */
            color_value = (color_value + brightness - 0.5) * contrast + 0.5;

            /* Multiply with color and weight */
            data_color += color_value * <%= name %>_weight * <%= name %>_color;

          <% }) %> ;
        <% } %>


        /* Color map (<= to fight rounding mistakes) */

        if ( id > 0.1 ) {
          vec4 HSV = vec4( mod( 6.0 * id * golden_ratio, 6.0), 1.0, 1.0, 1.0 );
          gl_FragColor = (1.0 - alpha/100.0) * vec4(data_color, 1.0) + alpha/100.0 * hsv_to_rgb( HSV );
        } else {
          gl_FragColor = vec4(data_color, 1.0);
        }
      }
      """
      {
        layers : colorLayerNames
        hasSegmentation : @model.binary["segmentation"]?
        isRgb : @model.binary["color"]?.targetBitDepth == 24
      }
    )
