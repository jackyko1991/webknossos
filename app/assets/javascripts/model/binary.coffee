### define
model/binary/cube : Cube
model/binary/pullqueue : PullQueue
model/game : Game
libs/simple_array_buffer_socket : SimpleArrayBufferSocket
libs/simple_worker : SimpleWorker
###

# #Model.Binary#
# Binary is the real deal.
# It loads and stores the primary graphical data.
# 
# ##Data structure##
#
# ###Concept###
# We store 3-dimensional data with each coordinate >= [0,0,0].
# Each point is stored in **buckets** which resemble a cubical grid. 
# Those buckets are kept in an expandable data structure (**cube**) which 
# represents the smallest cuboid covering all used buckets.
# 
# ###Implementation###
# Each point value (greyscale color) is represented by a number 
# between 0 and 255, where 0 is black and 255 white. 
# 
# The buckets are implemented as `Uint8Array`s with a length of
# `BUCKET_WIDTH ^ 3`. Each point can be easiliy found through simple 
# arithmetic (see `Model.Binary.pointIndexByVertex`). Each bucket has an 
# address which is its coordinate representation and can be computed 
# by (integer-)dividing each coordinate with `BUCKET_WIDTH`.
#
# We actually use bitwise operations to perform some of our 
# computations. Therefore `BUCKET_WIDTH` needs to be a power of 2.
# Also we consider a bucket to be either non-existant or full. There
# are no sparse buckets.
#
# The cube is defined by the offset `[x,y,z]` and size `[a,b,c]` 
# of the cuboid. Both refer to the address of the buckets. It is 
# actually just a standard javascript array with each item being 
# either `null`, `loadingState` or a bucket. The length of the
# array is `a * b * c`. Also finding the containing bucket of a point 
# can be done with pretty simple math (see 
# `Model.Binary.bucketIndexByVertex`).
#
# Currently, we store separate sets of data for each zoom level.
#
# ###Inserting###
# When inserting new data into the data structure we first need
# to make sure the cube is big enough to cover all buckets. Otherwise
# we'll have to expand the cube (see `Model.Binary.extendByAddressExtent`). 
# Then we just set the buckets.  
#
# ##Loading##
# We do attempt to preload buckets intelligently (see 
# `Model.Binary.ping`). Using the camera matrix we use a transformed 
# preview volume (currently a cuboid) to determine which buckets are
# relevant to load right now. Those buckets are then enumerated starting
# with the current center of projection. They are used to populate a
# download queue, so 5 buckets can be loaded at a time.
# Once a new `Model.Binary.ping` is executed, the queue will be cleared
# again. This algorithm ensures the center bucket to be loaded first always.
#
# ##Querying##
# `Model.Binary.get` provides an interface to query the stored data.
# Give us an array of coordinates (vertices) and we'll give you the 
# corresponding color values. We apply either a linear, bilinear or 
# trilinear interpolation so the result should be quite smooth. However, 
# if one of the required 2, 4 or 8 points is missing we'll decide that 
# your requested point can't be valid aswell.
#


Binary =

  # Constants
  PING_THROTTLE_TIME : 1000
  TEXTURE_SIZE : 512

  VIEW_XY : 0
  VIEW_XZ : 1
  VIEW_YZ : 2

  # Priorities
  PRIORITIES : [
    240, 239, 238, 237, 236, 235, 234, 233, 232, 231, 230, 229, 228, 227, 226, 225, 288,
    241, 182, 181, 180, 179, 178, 177, 176, 175, 174, 173, 172, 171, 170, 169, 224, 287,
    242, 183, 132, 131, 130, 129, 128, 127, 126, 125, 124, 123, 122, 121, 168, 223, 286,
    243, 184, 133,  90,  89,  88,  87,  86,  85,  84,  83,  82,  81, 120, 167, 222, 285,
    244, 185, 134,  91,  56,  55,  54,  53,  52,  51,  50,  49,  80, 119, 166, 221, 284,
    245, 186, 135,  92,  57,  30,  29,  28,  27,  26,  25,  48,  79, 118, 165, 220, 283,
    246, 187, 136,  93,  58,  31,  12,  11,  10,   9,  24,  47,  78, 117, 164, 219, 282,
    247, 188, 137,  94,  59,  32,  13,   2,   1,   8,  23,  46,  77, 116, 163, 218, 281,
    248, 189, 138,  95,  60,  33,  14,   3,   0,   7,  22,  45,  76, 115, 162, 217, 280,
    249, 190, 139,  96,  61,  34,  15,   4,   5,   6,  21,  44,  75, 114, 161, 216, 279,
    250, 191, 140,  97,  62,  35,  16,  17,  18,  19,  20,  43,  74, 113, 160, 215, 278,
    251, 192, 141,  98,  63,  36,  37,  38,  39,  40,  41,  42,  73, 112, 159, 214, 277,
    252, 193, 142,  99,  64,  65,  66,  67,  68,  69,  70,  71,  72, 111, 158, 213, 276,
    253, 194, 143, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 157, 212, 275,
    254, 195, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 211, 274,
    255, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 273,
    256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272]

  PRELOADING : [0,10,20]

  views : [
    { topLeftBucket : null, zoomStep : null }
    { topLeftBucket : null, zoomStep : null }
    { topLeftBucket : null, zoomStep : null }
  ]

  # Use this method to let us know when you've changed your spot. Then we'll try to 
  # preload some data. 
  ping : (position, zoomStep, direction) ->

    @ping = _.throttle(@pingImpl, @PING_THROTTLE_TIME)
    @ping(position, zoomStep, direction)

  pingImpl : (position, zoomStep, direction) ->

    unless _.isEqual({ position, zoomStep, direction }, { @lastPosition, @lastZoomStep, @lastDirection })

      @lastPosition = position
      @lastZoomStep = zoomStep
      @lastDirection = direction

      console.time "ping"

      #positionBucket = [position[0] >> (5 + zoomStep), position[1] >> (5 + zoomStep), position[2] >> (5 + zoomStep)]
      #buckets = @getBucketArray(@positionBucket, @TEXTURE_SIZE >> 6, @TEXTURE_SIZE >> 6, 0).concat(
      #          @getBucketArray(@positionBucket, @TEXTURE_SIZE >> 6, 0, @TEXTURE_SIZE >> 6),
      #          @getBucketArray(@positionBucket, 0, @TEXTURE_SIZE >> 6, @TEXTURE_SIZE >> 6))

      #Cube.extendByBucketAddressExtent6(
      #  @positionBucket[0] - (@TEXTURE_SIZE >> 6), @positionBucket[1] - (@TEXTURE_SIZE >> 6), @positionBucket[2] - (@TEXTURE_SIZE >> 6),
      #  @positionBucket[0] + (@TEXTURE_SIZE >> 6), @positionBucket[1] + (@TEXTURE_SIZE >> 6), @positionBucket[2] + (@TEXTURE_SIZE >> 6),
      #  zoomStep)

      Cube.extendByBucketAddressExtent6(0, 0, 0, 7, 7, 7)

      #console.time "queue"
      PullQueue.clear()

      #direction = [0,0,1]

      #delta_x = delta_y = delta_z = 0
      #direction_x = direction_y = direction_z = 0
      #index = buckets.length
      #level = 0

      #i = buckets.length * @PRELOADING.length
      #while i--
      #  index--
      #  if buckets[index]
      #    PullQueue.insert [buckets[index][0] + direction_x, buckets[index][1] + direction_y, buckets[index][2] + direction_z], zoomStep, @PRIORITIES[index % @PRIORITIES.length] + @PRELOADING[level]

      #  unless i % buckets.length
      #    index = buckets.length
      #    level++

      #    delta_x += direction[0]
      #    delta_y += direction[1]
      #    delta_z += direction[2]
      #    direction_x = Math.round(delta_x)
      #    direction_y = Math.round(delta_y)
      #    direction_z = Math.round(delta_z)

      PullQueue.insert [0, 0, 0], 3, 0
      PullQueue.insert [0, 0, 0], 1, 1
      PullQueue.insert [1, 1, 0], 1, 2
      PullQueue.insert [0, 0, 0], 0, 3
      PullQueue.insert [0, 1, 0], 0, 4
      PullQueue.insert [0, 2, 0], 0, 5
      PullQueue.insert [0, 3, 0], 0, 6

      console.timeEnd "queue"
      
      PullQueue.pull()
      
      console.timeEnd "ping"

      console.log Cube.getCube()


  getXY : (position, zoomStep, area) ->
    $.when(@getSync(position, zoomStep, area, @VIEW_XY))


  getXZ : (position, zoomStep, area) ->

    $.when(@getXZSync(position, zoomStep, area, @VIEW_XZ))


  getYZ : (position, zoomStep, area) ->

    $.when(@getYZSync(position, zoomStep, area, @VIEW_YZ))


  # A synchronized implementation of `get`. Cuz its faster.
  getSync : (position, zoomStep, area, view) ->
    position = [0,0,33]
    area = [0,0,32,32]
    zoomStep = 2

    currentView = @views[view]

    topLeftBucket = Cube.vertexToZoomedBucketAddress3(
      position[0] - (@TEXTURE_SIZE >> 1)
      position[1] - (@TEXTURE_SIZE >> 1)
      position[2] - (@TEXTURE_SIZE >> 1)
      zoomStep
    )

    layerMask = (1 << 5) - 1
    layer = position[2] & layerMask if view.view == @VIEW_XY
    layer = position[1] & layerMask if view.view == @VIEW_XZ
    layer = position[0] & layerMask if view.view == @VIEW_YZ

    area = [
      area[0] >> 5
      area[1] >> 5
      area[2] - 1 >> 5
      area[3] - 1 >> 5
    ]

    unless _.isEqual(currentView.topLeftBucket, topLeftBucket) and _.isEqual(currentView.zoomStep, zoomStep)

      view.topLeftBucket = topLeftBucket
      view.zoomStep = zoomStep
      view.area = area
      view.bucketStatusArray = @getBucketStatusArray(topLeftBucket, @TEXTURE_SIZE >> 5, @TEXTURE_SIZE >> 5, view.view)
      view.buffer = new Uint8Array(@TEXTURE_SIZE * @TEXTURE_SIZE)
      view.changed = true

    if view.changed or not _.isEqual(view.area, area)

      for u in [area[0]..area[2]] by 1
        for v in [area[1]..area[3]] by 1
          if view.bucketStatusArray[(area[2] - area[0] + 1) * u + v]
            @renderBucketToBuffer(view.buffer, u << 5 + @TEXTURE_SIZE * v << 5, @generateRenderMap())
            view.bucketArray[(area[2] - area[0] + 1) * u + v] = false

      view.area = area
      view.changed = false

      view.buffer
    
    else
      null


  generateRenderMap : () ->
   # if zoomStep:
    
    #  width = 1 << zoomStep
     # for dx in [0...width] by 1
      #  for dy in [0...width] by 1
       #   for dz in [0...width] by 1
        #    if 
         #     addBucketToRenderMap()
    #else
     # {  }


  renderBucketToBuffer : (buffer, bufferOffset, renderMap) ->
    null


  getBucketStatusArray : (offset, range_u, range_v, view) ->

    status = []

    offset = [offset[0], offset[2], offset[1]] if view == @VIEW_XZ
    offset = [offset[1], offset[2], offset[0]] if view == @VIEW_YZ

    for delta_u in [0..range_u - 1] by 1
      for delta_v in [0..range_v - 1] by 1
        status.push offset[0] + delta_u >= 0 and offset[1] + delta_v >= 0 and offset[2] >= 0

    status